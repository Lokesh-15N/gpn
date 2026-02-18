import express from 'express';
import { Department, Doctor } from '../models/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get all departments
router.get('/', async (req, res) => {
  try {
    const departments = await Department.findAll({
      where: { status: 'ACTIVE' },
      attributes: ['dept_id', 'name', 'code', 'avg_consultation_time', 'color_code'],
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch departments' }
    });
  }
});

// Get doctors by department
router.get('/:deptId/doctors', async (req, res) => {
  try {
    const { deptId } = req.params;

    const doctors = await Doctor.findAll({
      where: {
        primary_dept_id: deptId,
        status: 'ACTIVE'
      },
      attributes: ['doctor_id', 'name', 'specialization', 'avg_consultation_time', 'status'],
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: doctors
    });
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch doctors' }
    });
  }
});

export default router;
