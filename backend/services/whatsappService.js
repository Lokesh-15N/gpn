// WhatsApp Service using Twilio
// Install: npm install twilio

import twilio from 'twilio';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER; // e.g., whatsapp:+14155238886

let client = null;

// Initialize client only if credentials are provided
if (accountSid && authToken) {
    client = twilio(accountSid, authToken);
}

/**
 * Send WhatsApp message to a phone number
 * @param {string} phoneNumber - Recipient's phone number with country code (e.g., +1234567890)
 * @param {string} message - Message content
 * @returns {Promise<Object>} - Result object with success status
 */
const sendWhatsAppMessage = async (phoneNumber, message) => {
    try {
        if (!client) {
            console.log('WhatsApp service not configured. Skipping message.');
            return { success: false, error: 'WhatsApp not configured' };
        }

        // Ensure phone number starts with whatsapp: prefix
        const formattedNumber = phoneNumber.startsWith('whatsapp:')
            ? phoneNumber
            : `whatsapp:${phoneNumber}`;

        const result = await client.messages.create({
            body: message,
            from: twilioWhatsAppNumber,
            to: formattedNumber
        });

        console.log('WhatsApp message sent successfully:', result.sid);
        return {
            success: true,
            messageId: result.sid,
            status: result.status
        };

    } catch (error) {
        console.error('WhatsApp sending error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Format appointment confirmation message
 */
const formatAppointmentConfirmation = (patientName, doctorName, slotDate, slotTime) => {
    return `🏥 *DOCSlot - Appointment Confirmed*

Hello ${patientName}! 👋

Your appointment has been successfully scheduled. ✅

📋 *Appointment Details:*
━━━━━━━━━━━━━━━━━━━━
👨‍⚕️ Doctor: Dr. ${doctorName}
📅 Date: ${slotDate}
🕐 Time: ${slotTime}
━━━━━━━━━━━━━━━━━━━━

📍 Please arrive 10 minutes early for registration.

Need to reschedule? Visit our website or contact us.

Thank you for choosing DOCSlot! 🙏

_This is an automated message. Please do not reply._`;
};

/**
 * Format appointment reminder message (24 hours before)
 */
const formatAppointmentReminder = (patientName, doctorName, slotDate, slotTime) => {
    return `⏰ *Appointment Reminder - DOCSlot*

Hi ${patientName},

This is a friendly reminder about your upcoming appointment:

👨‍⚕️ Doctor: Dr. ${doctorName}
📅 Tomorrow: ${slotDate}
🕐 Time: ${slotTime}

Please arrive 10 minutes early.

See you soon! 😊`;
};

/**
 * Format appointment cancellation message
 */
const formatAppointmentCancellation = (patientName, doctorName, slotDate, slotTime) => {
    return `❌ *Appointment Cancelled - DOCSlot*

Hello ${patientName},

Your appointment has been cancelled.

📋 *Cancelled Appointment:*
👨‍⚕️ Doctor: Dr. ${doctorName}
📅 Date: ${slotDate}
🕐 Time: ${slotTime}

Would you like to reschedule? Visit our website to book a new appointment.

If you didn't request this cancellation, please contact us immediately.`;
};

/**
 * Format payment confirmation message
 */
const formatPaymentConfirmation = (patientName, amount, appointmentDate) => {
    return `✅ *Payment Confirmed - DOCSlot*

Hello ${patientName},

Your payment has been received successfully! 💳

💰 Amount: ₹${amount}
📅 Appointment Date: ${appointmentDate}

Receipt has been sent to your email.

Thank you for your payment! 🙏`;
};

/**
 * Send appointment confirmation
 */
const sendAppointmentConfirmation = async (phoneNumber, patientName, doctorName, slotDate, slotTime) => {
    const message = formatAppointmentConfirmation(patientName, doctorName, slotDate, slotTime);
    return await sendWhatsAppMessage(phoneNumber, message);
};

/**
 * Send appointment reminder
 */
const sendAppointmentReminder = async (phoneNumber, patientName, doctorName, slotDate, slotTime) => {
    const message = formatAppointmentReminder(patientName, doctorName, slotDate, slotTime);
    return await sendWhatsAppMessage(phoneNumber, message);
};

/**
 * Send appointment cancellation
 */
const sendAppointmentCancellation = async (phoneNumber, patientName, doctorName, slotDate, slotTime) => {
    const message = formatAppointmentCancellation(patientName, doctorName, slotDate, slotTime);
    return await sendWhatsAppMessage(phoneNumber, message);
};

/**
 * Send payment confirmation
 */
const sendPaymentConfirmation = async (phoneNumber, patientName, amount, appointmentDate) => {
    const message = formatPaymentConfirmation(patientName, amount, appointmentDate);
    return await sendWhatsAppMessage(phoneNumber, message);
};

export {
    sendWhatsAppMessage,
    sendAppointmentConfirmation,
    sendAppointmentReminder,
    sendAppointmentCancellation,
    sendPaymentConfirmation,
    formatAppointmentConfirmation,
    formatAppointmentReminder,
    formatAppointmentCancellation,
    formatPaymentConfirmation
};
