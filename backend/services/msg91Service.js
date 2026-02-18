// MSG91 SMS Service with Alpha Sender
// Website: https://msg91.com/
// Supports: SMS, WhatsApp, Email, Voice

import axios from 'axios';

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID || 'DOCSLOT'; // Your alpha sender ID
const MSG91_ROUTE = process.env.MSG91_ROUTE || '4'; // 4 = transactional, 1 = promotional
const MSG91_DLT_TEMPLATE_ID = process.env.MSG91_DLT_TEMPLATE_ID; // For DLT compliance

/**
 * Send SMS using MSG91
 * @param {string} phoneNumber - Phone number with country code (e.g., 919876543210)
 * @param {string} message - Message content
 * @returns {Promise<Object>} - Result object
 */
const sendSMS = async (phoneNumber, message) => {
    try {
        if (!MSG91_AUTH_KEY) {
            console.log('⚠️ MSG91 not configured. Add MSG91_AUTH_KEY to .env file');
            return { success: false, error: 'MSG91 not configured' };
        }

        // Clean and format phone number (should be 91XXXXXXXXXX)
        let cleanNumber = phoneNumber.toString().replace(/[^0-9]/g, '');

        // Add country code if not present
        if (!cleanNumber.startsWith('91')) {
            cleanNumber = '91' + cleanNumber.slice(-10);
        }

        // MSG91 API endpoint
        const url = 'https://control.msg91.com/api/v5/flow/';

        const payload = {
            flow_id: MSG91_DLT_TEMPLATE_ID, // Your DLT approved template ID
            sender: MSG91_SENDER_ID,
            mobiles: cleanNumber,
            // For simple text message without template
            message: message,
            route: MSG91_ROUTE
        };

        const response = await axios.post(url, payload, {
            headers: {
                'authkey': MSG91_AUTH_KEY,
                'Content-Type': 'application/json'
            }
        });

        if (response.data.type === 'success') {
            console.log('✅ MSG91 SMS sent successfully to:', cleanNumber);
            return {
                success: true,
                messageId: response.data.message,
                data: response.data
            };
        } else {
            console.error('❌ MSG91 SMS failed:', response.data.message);
            return {
                success: false,
                error: response.data.message
            };
        }

    } catch (error) {
        console.error('❌ MSG91 error:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.message || error.message
        };
    }
};

/**
 * Send SMS using MSG91 Simple API (without template)
 * Use this if you don't have DLT template approval yet
 */
const sendSimpleSMS = async (phoneNumber, message) => {
    try {
        if (!MSG91_AUTH_KEY) {
            console.log('⚠️ MSG91 not configured');
            return { success: false, error: 'MSG91 not configured' };
        }

        // Clean phone number
        let cleanNumber = phoneNumber.toString().replace(/[^0-9]/g, '');
        if (!cleanNumber.startsWith('91')) {
            cleanNumber = '91' + cleanNumber.slice(-10);
        }

        // Simple SMS API endpoint (for testing)
        const url = `https://control.msg91.com/api/v5/flow/`;

        const params = {
            authkey: MSG91_AUTH_KEY,
            mobiles: cleanNumber,
            message: encodeURIComponent(message),
            sender: MSG91_SENDER_ID,
            route: MSG91_ROUTE,
            country: '91'
        };

        const response = await axios.get(url, { params });

        console.log('✅ MSG91 SMS sent:', response.data);
        return {
            success: true,
            data: response.data
        };

    } catch (error) {
        console.error('❌ MSG91 error:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.message || error.message
        };
    }
};

/**
 * Send SMS using MSG91 Send API (Most Common Method)
 */
const sendMsg91SMS = async (phoneNumber, message) => {
    try {
        if (!MSG91_AUTH_KEY) {
            console.log('⚠️ MSG91 not configured');
            return { success: false, error: 'MSG91 not configured' };
        }

        // Format phone number
        let cleanNumber = phoneNumber.toString().replace(/[^0-9]/g, '');
        if (!cleanNumber.startsWith('91')) {
            cleanNumber = '91' + cleanNumber.slice(-10);
        }

        const url = 'https://api.msg91.com/api/sendhttp.php';

        const params = new URLSearchParams({
            authkey: MSG91_AUTH_KEY,
            mobiles: cleanNumber,
            message: message,
            sender: MSG91_SENDER_ID,
            route: MSG91_ROUTE,
            country: '91'
        });

        const response = await axios.post(url, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        console.log('✅ MSG91 SMS sent successfully:', response.data);
        return {
            success: true,
            data: response.data
        };

    } catch (error) {
        console.error('❌ MSG91 error:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.message || error.message
        };
    }
};

/**
 * Format appointment confirmation message
 */
const formatAppointmentSMS = (patientName, doctorName, date, time) => {
    return `Hi ${patientName}! Your appointment with Dr. ${doctorName} is confirmed for ${date} at ${time}. Please arrive 10 mins early. -DOCSlot`;
};

/**
 * Format cancellation message
 */
const formatCancellationSMS = (patientName, doctorName, date, time) => {
    return `Hi ${patientName}, your appointment with Dr. ${doctorName} on ${date} at ${time} has been cancelled. Visit our website to reschedule. -DOCSlot`;
};

/**
 * Format reminder message
 */
const formatReminderSMS = (patientName, doctorName, date, time) => {
    return `Reminder! Your appointment with Dr. ${doctorName} is tomorrow ${date} at ${time}. See you soon! -DOCSlot`;
};

/**
 * Send appointment confirmation SMS
 */
const sendAppointmentConfirmation = async (phone, patientName, doctorName, date, time) => {
    const message = formatAppointmentSMS(patientName, doctorName, date, time);
    return await sendMsg91SMS(phone, message);
};

/**
 * Send appointment cancellation SMS
 */
const sendAppointmentCancellation = async (phone, patientName, doctorName, date, time) => {
    const message = formatCancellationSMS(patientName, doctorName, date, time);
    return await sendMsg91SMS(phone, message);
};

/**
 * Send appointment reminder SMS
 */
const sendAppointmentReminder = async (phone, patientName, doctorName, date, time) => {
    const message = formatReminderSMS(patientName, doctorName, date, time);
    return await sendMsg91SMS(phone, message);
};

/**
 * Send payment confirmation SMS
 */
const sendPaymentConfirmation = async (phone, patientName, amount, date) => {
    const message = `Hi ${patientName}, payment of Rs.${amount} received successfully for appointment on ${date}. Thank you! -DOCSlot`;
    return await sendMsg91SMS(phone, message);
};

/**
 * Send OTP via MSG91
 */
const sendOTP = async (phone, otp) => {
    const message = `Your DOCSlot verification code is ${otp}. Valid for 10 minutes. Do not share with anyone.`;
    return await sendMsg91SMS(phone, message);
};

export {
    sendSMS,
    sendSimpleSMS,
    sendMsg91SMS,
    sendAppointmentConfirmation,
    sendAppointmentCancellation,
    sendAppointmentReminder,
    sendPaymentConfirmation,
    sendOTP
};
