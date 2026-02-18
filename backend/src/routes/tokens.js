import express from 'express';
import { Token, Patient, Doctor, Department, Hospital } from '../models/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { Op } from 'sequelize';
import { calculateDynamicETA, recalculateQueueETA } from '../services/etaCalculator.js';
import { validateCheckInLocation } from '../services/geoFencing.js';

const router = express.Router();

// Request New Token
router.post('/request', authMiddleware(['PATIENT']), async (req, res) => {
  try {
    const {
      patientId,
      departmentId,
      doctorId,
      scheduledDate,
      visitReason,
      priority = 1
    } = req.body;

    // Verify patient
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: { code: 'PATIENT_NOT_FOUND', message: 'Patient not found' }
      });
    }

    // Get department
    const department = await Department.findByPk(departmentId);
    if (!department) {
      return res.status(404).json({
        success: false,
        error: { code: 'DEPARTMENT_NOT_FOUND', message: 'Department not found' }
      });
    }

    // Auto-assign doctor if not provided
    let assignedDoctorId = doctorId;
    if (!assignedDoctorId) {
      const availableDoctor = await Doctor.findOne({
        where: {
          primary_dept_id: departmentId,
          status: 'ACTIVE'
        },
        order: [[Doctor.sequelize.fn('RANDOM')]]
      });

      if (!availableDoctor) {
        return res.status(404).json({
          success: false,
          error: { code: 'NO_DOCTOR_AVAILABLE', message: 'No doctor available' }
        });
      }

      assignedDoctorId = availableDoctor.doctor_id;
    }

    // Get queue position
    const queuePosition = await Token.count({
      where: {
        doctor_id: assignedDoctorId,
        scheduled_time: {
          [Op.gte]: new Date().setHours(0, 0, 0, 0)
        },
        status: {
          [Op.in]: ['BOOKED', 'CHECKED_IN', 'WAITING']
        }
      }
    }) + 1;

    // Generate token number
    const tokenNumber = `${department.code}-${String(queuePosition).padStart(3, '0')}`;

    // Create token
    const token = await Token.create({
      token_number: tokenNumber,
      patient_id: patientId,
      doctor_id: assignedDoctorId,
      dept_id: departmentId,
      hospital_id: patient.hospital_id,
      booking_type: 'ONLINE',
      priority,
      status: 'BOOKED',
      scheduled_time: scheduledDate,
      queue_position: queuePosition,
      visit_reason: visitReason
    });

    // Calculate ETA
    const estimatedWaitTime = await calculateDynamicETA(token.token_id);

    // Get doctor and department info
    const doctor = await Doctor.findByPk(assignedDoctorId);

    res.status(201).json({
      success: true,
      data: {
        tokenId: token.token_id,
        tokenNumber: token.token_number,
        queuePosition,
        estimatedWaitTime,
        doctor: {
          name: doctor.name,
          specialization: doctor.specialization
        },
        scheduledTime: token.scheduled_time,
        instructions: 'Please arrive 15 minutes early'
      }
    });
  } catch (error) {
    console.error('Token request error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TOKEN_REQUEST_ERROR',
        message: error.message
      }
    });
  }
});

// Check-In Token (Geo-Fenced)
router.patch('/:tokenId/check-in', authMiddleware(['PATIENT']), async (req, res) => {
  try {
    const { tokenId } = req.params;
    const { latitude, longitude } = req.body;

    const token = await Token.findByPk(tokenId);
    if (!token) {
      return res.status(404).json({
        success: false,
        error: { code: 'TOKEN_NOT_FOUND', message: 'Token not found' }
      });
    }

    // Validate location
    const locationValidation = await validateCheckInLocation(tokenId, latitude, longitude);

    if (!locationValidation.success) {
      return res.status(400).json({
        success: false,
        error: locationValidation
      });
    }

    // Update token
    await token.update({
      status: 'CHECKED_IN',
      check_in_time: new Date(),
      check_in_latitude: latitude,
      check_in_longitude: longitude
    });

    // Recalculate ETA
    const estimatedWaitTime = await calculateDynamicETA(tokenId);

    // Get tokens ahead
    const tokensAhead = await Token.count({
      where: {
        doctor_id: token.doctor_id,
        queue_position: { [Op.lt]: token.queue_position },
        status: { [Op.in]: ['WAITING', 'IN_CONSULTATION'] }
      }
    });

    res.json({
      success: true,
      data: {
        tokenId: token.token_id,
        status: 'CHECKED_IN',
        queuePosition: token.queue_position,
        estimatedWaitTime,
        message: "You're checked in! Proceed to waiting area.",
        tokensAhead
      }
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CHECKIN_ERROR',
        message: error.message
      }
    });
  }
});

// Get Token Details
router.get('/:tokenId', authMiddleware(['PATIENT', 'DOCTOR']), async (req, res) => {
  try {
    const { tokenId } = req.params;

    const token = await Token.findByPk(tokenId, {
      include: [
        { model: Patient, as: 'patient', attributes: ['name', 'uhid', 'phone'] },
        { model: Doctor, as: 'doctor', attributes: ['name', 'specialization'] },
        { model: Department, as: 'department', attributes: ['name', 'code'] }
      ]
    });

    if (!token) {
      return res.status(404).json({
        success: false,
        error: { code: 'TOKEN_NOT_FOUND', message: 'Token not found' }
      });
    }

    res.json({
      success: true,
      data: {
        tokenId: token.token_id,
        tokenNumber: token.token_number,
        status: token.status,
        patient: token.patient,
        doctor: token.doctor,
        department: token.department,
        timeline: {
          booked: token.created_at,
          checkedIn: token.check_in_time,
          estimated: new Date(Date.now() + token.estimated_wait_time * 60000)
        },
        queuePosition: token.queue_position,
        estimatedWaitTime: token.estimated_wait_time,
        lastUpdated: token.eta_updated_at
      }
    });
  } catch (error) {
    console.error('Get token error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_TOKEN_ERROR',
        message: error.message
      }
    });
  }
});

// Cancel Token
router.delete('/:tokenId', authMiddleware(['PATIENT', 'ADMIN']), async (req, res) => {
  try {
    const { tokenId } = req.params;
    const { reason } = req.body;

    const token = await Token.findByPk(tokenId);
    if (!token) {
      return res.status(404).json({
        success: false,
        error: { code: 'TOKEN_NOT_FOUND', message: 'Token not found' }
      });
    }

    await token.update({
      status: 'CANCELLED',
      cancellation_reason: reason
    });

    res.json({
      success: true,
      message: 'Token cancelled successfully',
      refundEligible: false
    });
  } catch (error) {
    console.error('Cancel token error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CANCEL_TOKEN_ERROR',
        message: error.message
      }
    });
  }
});

export default router;
