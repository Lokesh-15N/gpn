// Twilio SMS Service with Alpha Sender
// Website: https://www.twilio.com/

import twilio from 'twilio';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const TWILIO_ALPHA_SENDER = process.env.TWILIO_ALPHA_SENDER || 'DOCSlot';

let twilioClient = null;

// Initialize Twilio client
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    console.log('✅ Twilio SMS Service initialized');
} else {
    console.log('⚠️ Twilio not configured. Add TWILIO credentials to .env');
}

/**
 * Send SMS using Twilio with Alpha Sender
 * @param {string} phoneNumber - Phone number with country code (e.g., +919876543210)
 * @param {string} message - Message content
 * @returns {Promise<Object>} - Result object
 */
const sendSMS = async (phoneNumber, message) => {
    try {
        if (!twilioClient) {
            console.log('⚠️ Twilio not configured. SMS not sent.');
            return { success: false, error: 'Twilio not configured' };
        }

        // Clean and format phone number (ensure it starts with +)
        let cleanNumber = phoneNumber.toString().replace(/[^0-9+]/g, '');

        // Add + prefix if not present
        if (!cleanNumber.startsWith('+')) {
            // For Indian numbers, add +91
            if (cleanNumber.length === 10) {
                cleanNumber = '+91' + cleanNumber;
            } else if (cleanNumber.startsWith('91') && cleanNumber.length === 12) {
                cleanNumber = '+' + cleanNumber;
            } else {
                cleanNumber = '+' + cleanNumber;
            }
        }

        // Send SMS via Twilio
        const result = await twilioClient.messages.create({
            body: message,
            // Use Alpha Sender if configured, otherwise use phone number
            from: TWILIO_ALPHA_SENDER || TWILIO_PHONE_NUMBER,
            to: cleanNumber
        });

        console.log('✅ Twilio SMS sent successfully');
        console.log('   To:', cleanNumber);
        console.log('   From:', TWILIO_ALPHA_SENDER || TWILIO_PHONE_NUMBER);
        console.log('   SID:', result.sid);

        return {
            success: true,
            messageId: result.sid,
            status: result.status,
            data: result
        };

    } catch (error) {
        console.error('❌ Twilio SMS error:', error.message);
        if (error.code) {
            console.error('   Error Code:', error.code);
        }
        return {
            success: false,
            error: error.message,
            code: error.code
        };
    }
};

/**
 * Format appointment confirmation message
 */
const formatAppointmentSMS = (patientName, doctorName, date, time) => {
    return `Hi ${patientName}! Your appointment with Dr. ${doctorName} is confirmed for ${date} at ${time}. Please arrive 10 mins early. - DOCSlot`;
};

/**
 * Format cancellation message
 */
const formatCancellationSMS = (patientName, doctorName, date, time) => {
    return `Hi ${patientName}, your appointment with Dr. ${doctorName} on ${date} at ${time} has been cancelled. Visit our website to reschedule. - DOCSlot`;
};

/**
 * Format reminder message
 */
const formatReminderSMS = (patientName, doctorName, date, time) => {
    return `Reminder: Your appointment with Dr. ${doctorName} is tomorrow ${date} at ${time}. See you soon! - DOCSlot`;
};

/**
 * Send appointment confirmation SMS
 */
const sendAppointmentConfirmation = async (phone, patientName, doctorName, date, time) => {
    const message = formatAppointmentSMS(patientName, doctorName, date, time);
    return await sendSMS(phone, message);
};

/**
 * Send appointment cancellation SMS
 */
const sendAppointmentCancellation = async (phone, patientName, doctorName, date, time) => {
    const message = formatCancellationSMS(patientName, doctorName, date, time);
    return await sendSMS(phone, message);
};

/**
 * Send appointment reminder SMS
 */
const sendAppointmentReminder = async (phone, patientName, doctorName, date, time) => {
    const message = formatReminderSMS(patientName, doctorName, date, time);
    return await sendSMS(phone, message);
};

/**
 * Send payment confirmation SMS
 */
const sendPaymentConfirmation = async (phone, patientName, amount, date) => {
    const message = `Hi ${patientName}, payment of Rs.${amount} received successfully for appointment on ${date}. Thank you! - DOCSlot`;
    return await sendSMS(phone, message);
};

/**
 * Send OTP via Twilio
 */
const sendOTP = async (phone, otp) => {
    const message = `Your DOCSlot verification code is ${otp}. Valid for 10 minutes. Do not share with anyone.`;
    return await sendSMS(phone, message);
};

export {
    sendSMS,
    sendAppointmentConfirmation,
    sendAppointmentCancellation,
    sendAppointmentReminder,
    sendPaymentConfirmation,
    sendOTP
};
