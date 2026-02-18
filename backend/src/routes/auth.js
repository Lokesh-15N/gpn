import express from 'express';
import { Doctor, Patient } from '../models/index.js';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../middleware/auth.js';
import { Op } from 'sequelize';

const router = express.Router();

// Patient Registration/Login
router.post('/patient/register', async (req, res) => {
  try {
    const { phone, name, hospitalId } = req.body;

    // Check if patient exists
    let patient = await Patient.findOne({ where: { phone, hospital_id: hospitalId } });

    if (!patient) {
      // Generate UHID
      const uhid = `H${Date.now().toString().slice(-6)}`;

      patient = await Patient.create({
        hospital_id: hospitalId,
        uhid,
        name,
        phone
      });
    }

    const accessToken = generateAccessToken({
      id: patient.patient_id,
      role: 'PATIENT',
      hospitalId: patient.hospital_id
    });

    const refreshToken = generateRefreshToken({
      id: patient.patient_id,
      role: 'PATIENT'
    });

    res.status(201).json({
      success: true,
      data: {
        patientId: patient.patient_id,
        uhid: patient.uhid,
        accessToken,
        refreshToken,
        expiresIn: 900
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REGISTRATION_ERROR',
        message: error.message
      }
    });
  }
});

// Doctor Login
router.post('/doctor/login', async (req, res) => {
  try {
    const { empCode, password, hospitalId } = req.body;

    const doctor = await Doctor.findOne({
      where: {
        emp_code: empCode,
        hospital_id: hospitalId
      }
    });

    if (!doctor) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid employee code or password'
        }
      });
    }

    const isValidPassword = await doctor.validatePassword(password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid employee code or password'
        }
      });
    }

    // Update last active
    await doctor.update({ last_active_at: new Date() });

    const accessToken = generateAccessToken({
      id: doctor.doctor_id,
      role: 'DOCTOR',
      hospitalId: doctor.hospital_id
    });

    const refreshToken = generateRefreshToken({
      id: doctor.doctor_id,
      role: 'DOCTOR'
    });

    res.json({
      success: true,
      data: {
        doctorId: doctor.doctor_id,
        name: doctor.name,
        specialization: doctor.specialization,
        accessToken,
        refreshToken,
        permissions: ['VIEW_QUEUE', 'MANAGE_TOKENS', 'UPDATE_STATUS']
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGIN_ERROR',
        message: error.message
      }
    });
  }
});

// Refresh Token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    const decoded = verifyToken(refreshToken);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid refresh token'
        }
      });
    }

    const newAccessToken = generateAccessToken({
      id: decoded.id,
      role: decoded.role,
      hospitalId: decoded.hospitalId
    });

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        expiresIn: 900
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REFRESH_ERROR',
        message: error.message
      }
    });
  }
});

export default router;
