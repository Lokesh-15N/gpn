import express from 'express';
import bcrypt from 'bcryptjs';
import { Hospital, Doctor, Department, Subscription } from '../models/index.js';
import { generateAccessToken, generateRefreshToken } from '../middleware/auth.js';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';

const router = express.Router();

// Get all hospitals/clinics with filtering
router.get('/', async (req, res) => {
  try {
    const { type, search, city } = req.query;

    const whereClause = {
      status: 'ACTIVE'
    };

    if (type) {
      whereClause.type = type.toUpperCase();
    }

    if (search) {
      whereClause.name = {
        [Op.iLike]: `%${search}%`
      };
    }

    if (city) {
      whereClause.address = {
        [Op.iLike]: `%${city}%`
      };
    }

    const hospitals = await Hospital.findAll({
      where: whereClause,
      attributes: [
        'hospital_id',
        'name',
        'address',
        'type',
        'latitude',
        'longitude',
        'geofence_radius',
        'operating_hours'
      ],
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: hospitals
    });
  } catch (error) {
    console.error('Error fetching hospitals/clinics:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch hospitals/clinics' }
    });
  }
});

// Register new clinic (self-registration)
router.post('/clinic/register', async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const {
      clinicName,
      address,
      latitude,
      longitude,
      doctorName,
      doctorPhone,
      doctorEmail,
      password,
      specialization,
      registrationNumber,
      operatingHours
    } = req.body;

    // Validate required fields
    if (!clinicName || !address || !doctorName || !doctorPhone || !doctorEmail || !password) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' }
      });
    }

    // Check if email already exists
    const existingDoctor = await Doctor.findOne({ where: { email: doctorEmail } });
    if (existingDoctor) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: { code: 'EMAIL_EXISTS', message: 'Email already registered' }
      });
    }

    // Create hospital record (type: CLINIC)
    const clinic = await Hospital.create({
      name: clinicName,
      address,
      latitude: latitude || 0,
      longitude: longitude || 0,
      type: 'CLINIC',
      subscription_tier: 'FREE',
      monthly_booking_limit: 50, // Free tier: 50 bookings/month
      current_month_bookings: 0,
      owner_name: doctorName,
      owner_phone: doctorPhone,
      owner_email: doctorEmail,
      registration_number: registrationNumber,
      operating_hours: operatingHours || {
        monday: { open: '09:00', close: '18:00' },
        tuesday: { open: '09:00', close: '18:00' },
        wednesday: { open: '09:00', close: '18:00' },
        thursday: { open: '09:00', close: '18:00' },
        friday: { open: '09:00', close: '18:00' },
        saturday: { open: '09:00', close: '14:00' },
        sunday: { open: 'closed', close: 'closed' }
      },
      status: 'ACTIVE'
    }, { transaction: t });

    // Create default department for clinic
    const department = await Department.create({
      hospital_id: clinic.hospital_id,
      name: specialization || 'General Practice',
      code: 'GEN',
      avg_consultation_time: 15,
      buffer_time: 5,
      status: 'ACTIVE'
    }, { transaction: t });

    // Create doctor record
    const doctor = await Doctor.create({
      hospital_id: clinic.hospital_id,
      primary_dept_id: department.dept_id,
      emp_code: `DOC${Date.now().toString().slice(-6)}`,
      name: doctorName,
      phone: doctorPhone,
      email: doctorEmail,
      password: password, // Will be hashed by model hook
      specialization: specialization || 'General Physician',
      avg_consultation_time: 15,
      max_tokens_per_session: 20,
      status: 'ACTIVE'
    }, { transaction: t });

    // Create free subscription record
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);

    await Subscription.create({
      hospital_id: clinic.hospital_id,
      tier: 'FREE',
      start_date: new Date(),
      end_date: subscriptionEndDate,
      booking_limit: 50,
      amount_paid: 0,
      status: 'ACTIVE',
      auto_renew: false
    }, { transaction: t });

    await t.commit();

    // Generate tokens for doctor login
    const accessToken = generateAccessToken({
      id: doctor.doctor_id,
      role: 'DOCTOR',
      hospitalId: clinic.hospital_id
    });

    const refreshToken = generateRefreshToken({
      id: doctor.doctor_id,
      role: 'DOCTOR'
    });

    res.status(201).json({
      success: true,
      message: 'Clinic registered successfully',
      data: {
        clinic: {
          id: clinic.hospital_id,
          name: clinic.name,
          type: clinic.type,
          subscription_tier: clinic.subscription_tier,
          monthly_booking_limit: clinic.monthly_booking_limit
        },
        doctor: {
          id: doctor.doctor_id,
          name: doctor.name,
          email: doctor.email,
          specialization: doctor.specialization
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });
  } catch (error) {
    await t.rollback();
    console.error('Clinic registration error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REGISTRATION_ERROR',
        message: error.message || 'Failed to register clinic'
      }
    });
  }
});

// Get clinic/hospital details
router.get('/:hospitalId', async (req, res) => {
  try {
    const { hospitalId } = req.params;

    const hospital = await Hospital.findByPk(hospitalId, {
      attributes: [
        'hospital_id',
        'name',
        'address',
        'type',
        'subscription_tier',
        'monthly_booking_limit',
        'current_month_bookings',
        'operatingHours',
        'status'
      ],
      include: [
        {
          model: Department,
          as: 'departments',
          where: { status: 'ACTIVE' },
          required: false,
          attributes: ['dept_id', 'name', 'code']
        },
        {
          model: Doctor,
          as: 'doctors',
          where: { status: 'ACTIVE' },
          required: false,
          attributes: ['doctor_id', 'name', 'specialization', 'avg_consultation_time']
        }
      ]
    });

    if (!hospital) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Hospital/Clinic not found' }
      });
    }

    res.json({
      success: true,
      data: hospital
    });
  } catch (error) {
    console.error('Error fetching hospital details:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch details' }
    });
  }
});

export default router;
