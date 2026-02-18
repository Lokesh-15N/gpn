import { Token, Doctor } from '../models/index.js';
import { Op } from 'sequelize';
import redisClient from '../config/redis.js';

/**
 * Calculate Dynamic ETA for a token
 * Based on the algorithm from 04_CORE_ALGORITHMS.md
 */
export const calculateDynamicETA = async (tokenId) => {
  try {
    // Step 1: Fetch token and doctor details
    const token = await Token.findByPk(tokenId, {
      include: [{ model: Doctor, as: 'doctor' }]
    });

    if (!token) {
      throw new Error('Token not found');
    }

    const doctorId = token.doctor_id;
    const queuePosition = token.queue_position;

    // Step 2: Get doctor's average consultation time
    const avgConsultTime = token.doctor.avg_consultation_time || 15;

    // Step 3: Count tokens ahead in queue
    const tokensAhead = await Token.count({
      where: {
        doctor_id: doctorId,
        status: { [Op.in]: ['WAITING', 'IN_CONSULTATION'] },
        queue_position: { [Op.lt]: queuePosition }
      }
    });

    // Step 4: Calculate BASE_WAIT
    const baseWait = tokensAhead * avgConsultTime;

    // Step 5: Calculate DEVIATION_CASCADE (Real-time adjustment)
    const currentConsultation = await Token.findOne({
      where: {
        doctor_id: doctorId,
        status: 'IN_CONSULTATION'
      }
    });

    let currentOvertime = 0;
    if (currentConsultation && currentConsultation.consultation_start_time) {
      const elapsedTime = Math.floor(
        (Date.now() - new Date(currentConsultation.consultation_start_time).getTime()) / 60000
      );

      if (elapsedTime > avgConsultTime) {
        currentOvertime = elapsedTime - avgConsultTime;
      } else {
        currentOvertime = Math.max(0, avgConsultTime - elapsedTime);
      }
    }

    // Step 6: Historical delay factor
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCompletedTokens = await Token.findAll({
      where: {
        doctor_id: doctorId,
        status: 'COMPLETED',
        consultation_end_time: {
          [Op.gte]: today
        }
      }
    });

    let accumulatedDelay = 0;
    if (todayCompletedTokens.length > 5) {
      const totalDeviation = todayCompletedTokens.reduce((sum, t) => {
        const scheduledTime = new Date(t.scheduled_time).getTime();
        const actualTime = new Date(t.consultation_start_time).getTime();
        return sum + ((actualTime - scheduledTime) / 60000);
      }, 0);

      const avgDeviationPerToken = totalDeviation / todayCompletedTokens.length;
      accumulatedDelay = tokensAhead * avgDeviationPerToken;
    }

    const deviationCascade = currentOvertime + accumulatedDelay;

    // Step 7: Add BUFFER_SLOTS
    const bufferSlots = tokensAhead * 5; // 5 minutes per transition

    // Step 8: PRIORITY_ADJUSTMENT
    let priorityAdjustment = 0;
    if (token.priority === 3) {
      priorityAdjustment = -10; // Emergency
    } else if (token.check_in_time) {
      const checkInDelay = (new Date(token.check_in_time).getTime() -
                           new Date(token.scheduled_time).getTime()) / 60000;
      if (checkInDelay > 15) {
        priorityAdjustment = 5; // Late check-in penalty
      }
    }

    // Step 9: Calculate TOTAL ETA
    let totalETA = baseWait + deviationCascade + bufferSlots + priorityAdjustment;

    // Step 10: Bounds check
    totalETA = Math.max(5, totalETA);
    totalETA = Math.min(totalETA, 180);
    totalETA = Math.round(totalETA);

    // Step 11: Update token with new ETA
    await token.update({
      estimated_wait_time: totalETA,
      eta_updated_at: new Date()
    });

    // Step 12: Cache in Redis
    await redisClient.set(
      `token:${tokenId}:eta`,
      totalETA.toString(),
      { EX: 300 } // 5 minutes TTL
    );

    return totalETA;
  } catch (error) {
    console.error('Error calculating ETA:', error);
    throw error;
  }
};

/**
 * Recalculate ETA for all affected tokens when doctor status changes
 */
export const recalculateQueueETA = async (doctorId) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const affectedTokens = await Token.findAll({
      where: {
        doctor_id: doctorId,
        status: { [Op.in]: ['WAITING', 'CHECKED_IN'] },
        scheduled_time: { [Op.gte]: today }
      },
      order: [['queue_position', 'ASC']]
    });

    for (const token of affectedTokens) {
      await calculateDynamicETA(token.token_id);
    }

    console.log(`Recalculated ETA for ${affectedTokens.length} tokens`);
    return affectedTokens.length;
  } catch (error) {
    console.error('Error recalculating queue ETA:', error);
    throw error;
  }
};
