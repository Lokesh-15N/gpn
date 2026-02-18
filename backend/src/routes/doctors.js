import express from 'express';
import { Token, Patient, Doctor } from '../models/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { Op } from 'sequelize';
import { recalculateQueueETA } from '../services/etaCalculator.js';

const router = express.Router();

// Get Doctor's Queue
router.get('/:doctorId/queue', authMiddleware(['DOCTOR']), async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date, status } = req.query;

    const queryDate = date ? new Date(date) : new Date();
    queryDate.setHours(0, 0, 0, 0);

    // Get current token in consultation
    const currentToken = await Token.findOne({
      where: {
        doctor_id: doctorId,
        status: 'IN_CONSULTATION'
      },
      include: [
        { model: Patient, as: 'patient', attributes: ['name', 'uhid'] }
      ]
    });

    let currentTokenData = null;
    if (currentToken) {
      const consultationDuration = Math.floor(
        (Date.now() - new Date(currentToken.consultation_start_time).getTime()) / 60000
      );

      currentTokenData = {
        tokenId: currentToken.token_id,
        tokenNumber: currentToken.token_number,
        patientName: currentToken.patient.name,
        uhid: currentToken.patient.uhid,
        visitReason: currentToken.visit_reason,
        status: 'IN_CONSULTATION',
        consultationDuration
      };
    }

    // Get upcoming tokens
    const upcomingTokens = await Token.findAll({
      where: {
        doctor_id: doctorId,
        scheduled_time: {
          [Op.gte]: queryDate
        },
        status: status ? status : { [Op.in]: ['WAITING', 'CHECKED_IN'] }
      },
      include: [
        { model: Patient, as: 'patient', attributes: ['name', 'uhid'] }
      ],
      order: [['queue_position', 'ASC']],
      limit: 20
    });

    const upcomingTokensData = upcomingTokens.map(token => ({
      queuePosition: token.queue_position,
      tokenNumber: token.token_number,
      patientName: token.patient.name,
      estimatedTime: new Date(Date.now() + token.estimated_wait_time * 60000),
      priority: token.priority,
      isCheckedIn: token.status === 'CHECKED_IN',
      visitReason: token.visit_reason
    }));

    // Get today's stats
    const todayStats = await Token.findAll({
      where: {
        doctor_id: doctorId,
        scheduled_time: {
          [Op.gte]: queryDate
        }
      },
      attributes: [
        [Token.sequelize.fn('COUNT', Token.sequelize.literal("CASE WHEN status = 'COMPLETED' THEN 1 END")), 'completed'],
        [Token.sequelize.fn('COUNT', Token.sequelize.literal("CASE WHEN status IN ('WAITING', 'CHECKED_IN') THEN 1 END")), 'pending'],
        [Token.sequelize.fn('COUNT', Token.sequelize.literal("CASE WHEN status = 'NO_SHOW' THEN 1 END")), 'noShow'],
        [Token.sequelize.fn('AVG', Token.sequelize.literal("CASE WHEN status = 'COMPLETED' AND consultation_start_time IS NOT NULL AND consultation_end_time IS NOT NULL THEN EXTRACT(EPOCH FROM (consultation_end_time - consultation_start_time))/60 END")), 'avgConsultTime']
      ],
      raw: true
    });

    res.json({
      success: true,
      data: {
        currentToken: currentTokenData,
        upcomingTokens: upcomingTokensData,
        stats: {
          completed: parseInt(todayStats[0].completed) || 0,
          pending: parseInt(todayStats[0].pending) || 0,
          noShow: parseInt(todayStats[0].noShow) || 0,
          avgConsultTime: Math.round(parseFloat(todayStats[0].avgConsultTime) || 0)
        }
      }
    });
  } catch (error) {
    console.error('Get queue error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_QUEUE_ERROR',
        message: error.message
      }
    });
  }
});

// Start Consultation
router.post('/consultations/start', authMiddleware(['DOCTOR']), async (req, res) => {
  try {
    const { tokenId, doctorId } = req.body;

    const token = await Token.findByPk(tokenId, {
      include: [
        { model: Patient, as: 'patient' }
      ]
    });

    if (!token) {
      return res.status(404).json({
        success: false,
        error: { code: 'TOKEN_NOT_FOUND', message: 'Token not found' }
      });
    }

    // Update token status
    await token.update({
      status: 'IN_CONSULTATION',
      consultation_start_time: new Date(),
      called_time: new Date()
    });

    // Recalculate ETA for remaining tokens
    await recalculateQueueETA(doctorId);

    res.json({
      success: true,
      data: {
        consultationId: token.token_id,
        tokenNumber: token.token_number,
        patientName: token.patient.name,
        startedAt: token.consultation_start_time
      },
      websocketEvent: 'TOKEN_STATUS_CHANGED'
    });
  } catch (error) {
    console.error('Start consultation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'START_CONSULTATION_ERROR',
        message: error.message
      }
    });
  }
});

// Complete Consultation
router.post('/consultations/:consultationId/complete', authMiddleware(['DOCTOR']), async (req, res) => {
  try {
    const { consultationId } = req.params;
    const { diagnosis, prescription, nextVisit, notes } = req.body;

    const token = await Token.findByPk(consultationId);

    if (!token) {
      return res.status(404).json({
        success: false,
        error: { code: 'TOKEN_NOT_FOUND', message: 'Token not found' }
      });
    }

    // Update token
    await token.update({
      status: 'COMPLETED',
      consultation_end_time: new Date(),
      notes: {
        ...token.notes,
        diagnosis,
        prescription,
        nextVisit,
        clinicalNotes: notes
      }
    });

    // Get next token
    const nextToken = await Token.findOne({
      where: {
        doctor_id: token.doctor_id,
        status: { [Op.in]: ['WAITING', 'CHECKED_IN'] },
        queue_position: { [Op.gt]: token.queue_position }
      },
      order: [['queue_position', 'ASC']],
      include: [
        { model: Patient, as: 'patient', attributes: ['name'] }
      ]
    });

    const duration = Math.floor(
      (new Date(token.consultation_end_time) - new Date(token.consultation_start_time)) / 60000
    );

    res.json({
      success: true,
      data: {
        tokenId: token.token_id,
        status: 'COMPLETED',
        duration,
        nextToken: nextToken ? {
          tokenNumber: nextToken.token_number,
          patientName: nextToken.patient.name,
          notificationSent: true
        } : null
      }
    });
  } catch (error) {
    console.error('Complete consultation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'COMPLETE_CONSULTATION_ERROR',
        message: error.message
      }
    });
  }
});

// Mark Patient No-Show
router.patch('/tokens/:tokenId/no-show', authMiddleware(['DOCTOR']), async (req, res) => {
  try {
    const { tokenId } = req.params;
    const { doctorId, reason } = req.body;

    const token = await Token.findByPk(tokenId);

    if (!token) {
      return res.status(404).json({
        success: false,
        error: { code: 'TOKEN_NOT_FOUND', message: 'Token not found' }
      });
    }

    await token.update({
      status: 'NO_SHOW',
      cancellation_reason: reason
    });

    // Get next token
    const nextToken = await Token.findOne({
      where: {
        doctor_id: doctorId,
        status: { [Op.in]: ['WAITING', 'CHECKED_IN'] },
        queue_position: { [Op.gt]: token.queue_position }
      },
      order: [['queue_position', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        tokenId: token.token_id,
        status: 'NO_SHOW',
        nextTokenCalled: !!nextToken,
        nextTokenNumber: nextToken?.token_number
      }
    });
  } catch (error) {
    console.error('No-show error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'NO_SHOW_ERROR',
        message: error.message
      }
    });
  }
});

// Update Doctor Status
router.patch('/:doctorId/status', authMiddleware(['DOCTOR']), async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { status, resumeTime } = req.body;

    const doctor = await Doctor.findByPk(doctorId);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: { code: 'DOCTOR_NOT_FOUND', message: 'Doctor not found' }
      });
    }

    await doctor.update({
      status,
      last_active_at: new Date()
    });

    const pendingTokens = await Token.count({
      where: {
        doctor_id: doctorId,
        status: { [Op.in]: ['WAITING', 'CHECKED_IN'] }
      }
    });

    res.json({
      success: true,
      data: {
        doctorId: doctor.doctor_id,
        status,
        pendingTokens,
        affectedTokensNotified: true
      }
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_STATUS_ERROR',
        message: error.message
      }
    });
  }
});

export default router;
