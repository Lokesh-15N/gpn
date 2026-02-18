// SMS Service using Fast2SMS (Easiest Option for India)
// Website: https://www.fast2sms.com/
// Free: 50 SMS on signup | Pricing: ₹0.15 per SMS

import axios from 'axios';

const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY;

/**
 * Send SMS using Fast2SMS
 * @param {string} phoneNumber - Phone number (10 digits or with +91)
 * @param {string} message - Message content (max 160 chars for single SMS)
 * @returns {Promise<Object>} - Result object
 */
const sendSMS = async (phoneNumber, message) => {
    try {
        if (!FAST2SMS_API_KEY) {
            console.log('⚠️ Fast2SMS not configured. Add FAST2SMS_API_KEY to .env file');
            return { success: false, error: 'SMS not configured' };
        }

        // Clean phone number - extract last 10 digits
        const cleanNumber = phoneNumber.toString().replace(/[^0-9]/g, '').slice(-10);

        if (cleanNumber.length !== 10) {
            console.error('Invalid phone number format:', phoneNumber);
            return { success: false, error: 'Invalid phone number' };
        }

        const response = await axios.post(
            'https://www.fast2sms.com/dev/bulkV2',
            {
                route: 'q', // Quick route (promotional)
                message: message,
                language: 'english',
                flash: 0, // 0 = normal SMS, 1 = flash SMS
                numbers: cleanNumber
            },
            {
                headers: {
                    'authorization': FAST2SMS_API_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data.return === true) {
            console.log('✅ SMS sent successfully to:', cleanNumber);
            return {
                success: true,
                messageId: response.data.request_id,
                data: response.data
            };
        } else {
            console.error('❌ SMS failed:', response.data.message);
            return {
                success: false,
                error: response.data.message || 'SMS sending failed'
            };
        }

    } catch (error) {
        console.error('❌ SMS error:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.message || error.message
        };
    }
};

/**
 * Format and send appointment confirmation SMS
 */
const sendAppointmentConfirmation = async (phone, patientName, doctorName, date, time) => {
    const message = `Hi ${patientName}! Your appointment with Dr. ${doctorName} is confirmed for ${date} at ${time}. Please arrive 10 mins early. -DOCSlot`;
    return await sendSMS(phone, message);
};

/**
 * Format and send appointment cancellation SMS
 */
const sendAppointmentCancellation = async (phone, patientName, doctorName, date, time) => {
    const message = `Hi ${patientName}, appointment with Dr. ${doctorName} on ${date} at ${time} has been cancelled. Visit us to reschedule. -DOCSlot`;
    return await sendSMS(phone, message);
};

/**
 * Send appointment reminder (24 hours before)
 */
const sendAppointmentReminder = async (phone, patientName, doctorName, date, time) => {
    const message = `Reminder! Your appointment with Dr. ${doctorName} is tomorrow ${date} at ${time}. See you soon! -DOCSlot`;
    return await sendSMS(phone, message);
};

/**
 * Send payment confirmation SMS
 */
const sendPaymentConfirmation = async (phone, patientName, amount, date) => {
    const message = `Hi ${patientName}, payment of Rs.${amount} received successfully for appointment on ${date}. Thank you! -DOCSlot`;
    return await sendSMS(phone, message);
};

/**
 * Send OTP for verification
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
