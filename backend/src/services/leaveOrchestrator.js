import { Token, Doctor, Department } from '../models/index.js';
import { Op } from 'sequelize';
import { calculateHaversineDistance } from './geoFencing.js';

/**
 * Handle doctor leave and implement intelligent redistribution
 * Based on the algorithm from 04_CORE_ALGORITHMS.md
 */
export const handleDoctorLeave = async (doctorId, startTime, endTime, exceptionType, reason) => {
  try {
    // STEP A: IDENTIFY AFFECTED TOKENS
    const affectedTokens = await Token.findAll({
      where: {
        doctor_id: doctorId,
        scheduled_time: {
          [Op.between]: [startTime, endTime]
        },
        status: {
          [Op.in]: ['BOOKED', 'CHECKED_IN', 'WAITING']
        }
      },
      include: [
        { model: require('../models/index.js').Patient, as: 'patient' }
      ],
      order: [
        ['priority', 'DESC'],
        ['scheduled_time', 'ASC']
      ]
    });

    if (affectedTokens.length === 0) {
      return {
        status: 'NO_ACTION_NEEDED',
        affectedCount: 0
      };
    }

    console.log(`Doctor ${doctorId} leave affects ${affectedTokens.length} tokens`);

    // STEP B: CHECK AVAILABLE CAPACITY
    const doctor = await Doctor.findByPk(doctorId);
    const sameDeptDoctors = await Doctor.findAll({
      where: {
        primary_dept_id: doctor.primary_dept_id,
        status: 'ACTIVE',
        doctor_id: {
          [Op.ne]: doctorId
        }
      }
    });

    const availableCapacity = [];

    for (const altDoctor of sameDeptDoctors) {
      const scheduledCount = await Token.count({
        where: {
          doctor_id: altDoctor.doctor_id,
          scheduled_time: {
            [Op.between]: [
              new Date(startTime).setHours(0, 0, 0, 0),
              new Date(startTime).setHours(23, 59, 59, 999)
            ]
          },
          status: {
            [Op.notIn]: ['COMPLETED', 'CANCELLED', 'NO_SHOW']
          }
        }
      });

      const maxCapacity = altDoctor.max_tokens_per_session;
      const remainingCapacity = maxCapacity - scheduledCount;

      if (remainingCapacity > 0) {
        availableCapacity.push({
          doctor_id: altDoctor.doctor_id,
          doctor_name: altDoctor.name,
          remaining_capacity: remainingCapacity,
          current_queue_length: scheduledCount,
          avg_consultation_time: altDoctor.avg_consultation_time,
          load_score: calculateLoadScore(remainingCapacity, scheduledCount)
        });
      }
    }

    // Sort by load_score (least loaded first)
    availableCapacity.sort((a, b) => a.load_score - b.load_score);

    // STEP C: REDISTRIBUTION LOGIC
    const redistributionPlan = {
      reassigned: [],
      rescheduled: [],
      cancelled: []
    };

    for (const token of affectedTokens) {
      const decision = makeRedistributionDecision(
        token,
        availableCapacity,
        exceptionType
      );

      if (decision.action === 'REASSIGN' && availableCapacity.length > 0) {
        const targetDoctor = availableCapacity[0];

        // Calculate new queue position
        const newQueuePosition = await Token.count({
          where: {
            doctor_id: targetDoctor.doctor_id,
            scheduled_time: {
              [Op.gte]: new Date().setHours(0, 0, 0, 0)
            },
            status: {
              [Op.in]: ['BOOKED', 'CHECKED_IN', 'WAITING']
            }
          }
        }) + 1;

        await token.update({
          doctor_id: targetDoctor.doctor_id,
          queue_position: newQueuePosition,
          notes: {
            ...token.notes,
            reassignment: {
              reason: `Doctor leave - ${reason}`,
              original_doctor_id: doctorId,
              reassigned_at: new Date()
            }
          }
        });

        redistributionPlan.reassigned.push({
          tokenId: token.token_id,
          tokenNumber: token.token_number,
          newDoctor: targetDoctor.doctor_name,
          newTime: token.scheduled_time
        });

        // Decrease available capacity
        targetDoctor.remaining_capacity--;
        if (targetDoctor.remaining_capacity <= 0) {
          availableCapacity.shift();
        }

      } else if (decision.action === 'RESCHEDULE') {
        await token.update({
          status: 'RESCHEDULED',
          cancellation_reason: `Doctor unavailable - ${reason}`
        });

        redistributionPlan.rescheduled.push({
          tokenId: token.token_id,
          tokenNumber: token.token_number
        });

      } else {
        await token.update({
          status: 'CANCELLED',
          cancellation_reason: `Doctor unavailable - no alternative found`
        });

        redistributionPlan.cancelled.push({
          tokenId: token.token_id,
          tokenNumber: token.token_number
        });
      }
    }

    return redistributionPlan;
  } catch (error) {
    console.error('Error handling doctor leave:', error);
    throw error;
  }
};

/**
 * Decision algorithm: Reassign vs Reschedule vs Cancel
 */
const makeRedistributionDecision = (token, availableCapacity, exceptionType) => {
  // RULE 1: Emergency tokens MUST be reassigned
  if (token.priority === 3) {
    if (availableCapacity.length > 0) {
      return {
        action: 'REASSIGN',
        target_doctor: availableCapacity[0],
        reason: 'Emergency priority'
      };
    } else {
      return {
        action: 'ESCALATE',
        reason: 'Emergency token with no capacity'
      };
    }
  }

  // RULE 2: Already checked-in patients (physically present)
  if (token.status === 'CHECKED_IN') {
    if (availableCapacity.length > 0) {
      const bestOption = availableCapacity.reduce((min, curr) =>
        curr.current_queue_length < min.current_queue_length ? curr : min
      );
      return {
        action: 'REASSIGN',
        target_doctor: bestOption,
        reason: 'Patient already at hospital'
      };
    } else {
      return {
        action: 'RESCHEDULE',
        reason: 'No available capacity for reassignment'
      };
    }
  }

  // RULE 3: Unplanned/Emergency leave - bias towards reassignment
  if ((exceptionType === 'UNPLANNED_LEAVE' || exceptionType === 'EMERGENCY')
      && availableCapacity.length > 0) {
    const leastLoaded = availableCapacity[0];
    if (leastLoaded.remaining_capacity >= 5) {
      return {
        action: 'REASSIGN',
        target_doctor: leastLoaded,
        reason: 'Emergency leave - reassigning'
      };
    }
  }

  // RULE 4: Default - Reschedule
  return {
    action: 'RESCHEDULE',
    reason: 'Default reschedule with original doctor'
  };
};

/**
 * Calculate load score (lower is better)
 */
const calculateLoadScore = (remainingCapacity, currentQueueLength) => {
  if (remainingCapacity <= 0) {
    return 9999;
  }
  return (currentQueueLength * 2) + (50 - remainingCapacity);
};
