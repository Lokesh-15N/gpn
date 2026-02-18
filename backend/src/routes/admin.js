import express from 'express';
import { Token, Doctor, Department, Hospital } from '../models/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { Op } from 'sequelize';

const router = express.Router();

// Get Real-Time System Overview
router.get('/dashboard/overview', authMiddleware(['ADMIN']), async (req, res) => {
  try {
    const { hospitalId, date } = req.query;

    const queryDate = date ? new Date(date) : new Date();
    queryDate.setHours(0, 0, 0, 0);

    // Get summary stats
    const summary = await Token.findAll({
      where: {
        hospital_id: hospitalId,
        scheduled_time: {
          [Op.gte]: queryDate
        }
      },
      attributes: [
        [Token.sequelize.fn('COUNT', Token.sequelize.col('token_id')), 'totalTokens'],
        [Token.sequelize.fn('COUNT', Token.sequelize.literal("CASE WHEN status = 'COMPLETED' THEN 1 END")), 'completed'],
        [Token.sequelize.fn('COUNT', Token.sequelize.literal("CASE WHEN status = 'IN_CONSULTATION' THEN 1 END")), 'inProgress'],
        [Token.sequelize.fn('COUNT', Token.sequelize.literal("CASE WHEN status IN ('WAITING', 'CHECKED_IN') THEN 1 END")), 'waiting'],
        [Token.sequelize.fn('COUNT', Token.sequelize.literal("CASE WHEN status = 'NO_SHOW' THEN 1 END")), 'noShow']
      ],
      raw: true
    });

    // Get department-wise breakdown
    const departments = await Department.findAll({
      where: { hospital_id: hospitalId },
      include: [
        {
          model: Token,
          as: 'tokens',
          where: {
            scheduled_time: { [Op.gte]: queryDate },
            status: { [Op.in]: ['WAITING', 'CHECKED_IN', 'IN_CONSULTATION'] }
          },
          required: false
        },
        {
          model: Doctor,
          as: 'doctors',
          where: { status: 'ACTIVE' },
          required: false
        }
      ]
    });

    const departmentsData = await Promise.all(departments.map(async dept => {
      const queueLength = dept.tokens?.length || 0;
      const activeDoctors = dept.doctors?.length || 0;

      // Calculate average wait time
      const avgWaitTime = dept.tokens && dept.tokens.length > 0
        ? dept.tokens.reduce((sum, t) => sum + (t.estimated_wait_time || 0), 0) / dept.tokens.length
        : 0;

      // Determine bottleneck level
      let bottleneckLevel = 'NORMAL';
      let colorCode = '#00FF00';

      if (queueLength > 20 || avgWaitTime > 45) {
        bottleneckLevel = 'CRITICAL';
        colorCode = '#FF0000';
      } else if (queueLength > 15 || avgWaitTime > 30) {
        bottleneckLevel = 'WARNING';
        colorCode = '#FFA500';
      } else if (queueLength > 10 || avgWaitTime > 15) {
        bottleneckLevel = 'MODERATE';
        colorCode = '#FFFF00';
      }

      return {
        deptId: dept.dept_id,
        name: dept.name,
        queueLength,
        activeDoctors,
        avgWaitTime: Math.round(avgWaitTime),
        bottleneckLevel,
        colorCode
      };
    }));

    res.json({
      success: true,
      data: {
        summary: {
          totalTokens: parseInt(summary[0].totalTokens) || 0,
          completed: parseInt(summary[0].completed) || 0,
          inProgress: parseInt(summary[0].inProgress) || 0,
          waiting: parseInt(summary[0].waiting) || 0,
          noShow: parseInt(summary[0].noShow) || 0
        },
        departments: departmentsData,
        alerts: [],
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DASHBOARD_ERROR',
        message: error.message
      }
    });
  }
});

// Get Department Heatmap Data
router.get('/heatmap', authMiddleware(['ADMIN']), async (req, res) => {
  try {
    const { hospitalId, date } = req.query;

    const queryDate = date ? new Date(date) : new Date();
    queryDate.setHours(0, 0, 0, 0);

    const departments = await Department.findAll({
      where: { hospital_id: hospitalId }
    });

    const heatmapData = await Promise.all(departments.map(async dept => {
      const hourlyData = [];

      for (let hour = 8; hour < 20; hour++) {
        const startTime = new Date(queryDate);
        startTime.setHours(hour, 0, 0, 0);

        const endTime = new Date(queryDate);
        endTime.setHours(hour + 1, 0, 0, 0);

        const tokensInHour = await Token.count({
          where: {
            dept_id: dept.dept_id,
            scheduled_time: {
              [Op.between]: [startTime, endTime]
            }
          }
        });

        const avgWaitResult = await Token.findAll({
          where: {
            dept_id: dept.dept_id,
            scheduled_time: {
              [Op.between]: [startTime, endTime]
            }
          },
          attributes: [
            [Token.sequelize.fn('AVG', Token.sequelize.col('estimated_wait_time')), 'avgWait']
          ],
          raw: true
        });

        const avgWait = parseFloat(avgWaitResult[0]?.avgWait) || 0;

        // Determine heat level
        let heatLevel = 'GREEN';
        let colorCode = '#00FF00';

        if (tokensInHour > 20 || avgWait > 45) {
          heatLevel = 'RED';
          colorCode = '#FF0000';
        } else if (tokensInHour > 15 || avgWait > 30) {
          heatLevel = 'ORANGE';
          colorCode = '#FFA500';
        } else if (tokensInHour > 10 || avgWait > 15) {
          heatLevel = 'YELLOW';
          colorCode = '#FFFF00';
        }

        hourlyData.push({
          hour: `${String(hour).padStart(2, '0')}:00`,
          queueLength: tokensInHour,
          avgWaitTime: Math.round(avgWait),
          heatLevel,
          colorCode
        });
      }

      const peakHour = hourlyData.reduce((max, curr) =>
        curr.queueLength > max.queueLength ? curr : max
      );

      return {
        deptId: dept.dept_id,
        deptName: dept.name,
        hourlyData,
        peakHour: peakHour.hour,
        recommendation: peakHour.queueLength > 20
          ? `Add 1 doctor at ${peakHour.hour} slot`
          : 'Staffing levels optimal'
      };
    }));

    res.json({
      success: true,
      data: {
        heatmapData
      }
    });
  } catch (error) {
    console.error('Heatmap error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'HEATMAP_ERROR',
        message: error.message
      }
    });
  }
});

export default router;
