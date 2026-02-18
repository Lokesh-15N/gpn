import https from 'https';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

/**
 * Send a message to the fixed Telegram chat (test device).
 * All notifications go here regardless of which user booked.
 */
const sendTelegramMessage = (text) => {
    return new Promise((resolve) => {
        const body = JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text,
            parse_mode: 'HTML',
        });

        const options = {
            hostname: 'api.telegram.org',
            path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
            },
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.ok) {
                        resolve({ success: true });
                    } else {
                        console.error('Telegram API error:', parsed.description);
                        resolve({ success: false, error: parsed.description });
                    }
                } catch (e) {
                    resolve({ success: false, error: e.message });
                }
            });
        });

        req.on('error', (err) => {
            console.error('Telegram request error:', err.message);
            resolve({ success: false, error: err.message });
        });

        req.write(body);
        req.end();
    });
};

/**
 * Format slotDate "12_10_2026" → "12 October 2026"
 */
const formatDate = (slotDate) => {
    try {
        const [day, month, year] = slotDate.split('_');
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December',
        ];
        return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
    } catch {
        return slotDate;
    }
};

/**
 * Send appointment confirmation after booking.
 * "Your appointment with Dr. Lokesh is Confirmed for 12:00 PM on 12 October 2026"
 */
export const sendAppointmentConfirmationTelegram = async (
    patientName,
    doctorName,
    slotDate,
    slotTime
) => {
    const dateStr = formatDate(slotDate);
    const message =
        `🏥 <b>Appointment Confirmed!</b>\n\n` +
        `👤 Patient: <b>${patientName}</b>\n` +
        `👨‍⚕️ Doctor: <b>Dr. ${doctorName.replace(/^Dr\.?\s*/i, '')}</b>\n` +
        `📅 Date: <b>${dateStr}</b>\n` +
        `⏰ Time: <b>${slotTime}</b>\n\n` +
        `✅ Your appointment is confirmed. Please arrive 10 minutes early.`;

    const result = await sendTelegramMessage(message);
    if (result.success) {
        console.log('✅ Telegram confirmation sent');
    } else {
        console.log('⚠️ Telegram confirmation failed:', result.error);
    }
    return result;
};

/**
 * Send 1-hour reminder before appointment.
 */
export const sendAppointmentReminderTelegram = async (
    patientName,
    doctorName,
    slotDate,
    slotTime
) => {
    const dateStr = formatDate(slotDate);
    const message =
        `⏰ <b>Appointment Reminder — 1 Hour Left!</b>\n\n` +
        `👤 Patient: <b>${patientName}</b>\n` +
        `👨‍⚕️ Doctor: <b>Dr. ${doctorName.replace(/^Dr\.?\s*/i, '')}</b>\n` +
        `📅 Date: <b>${dateStr}</b>\n` +
        `⏰ Time: <b>${slotTime}</b>\n\n` +
        `🔔 Your appointment is in <b>1 hour</b>. Please be ready!`;

    const result = await sendTelegramMessage(message);
    if (result.success) {
        console.log('✅ Telegram reminder sent for', patientName);
    } else {
        console.log('⚠️ Telegram reminder failed:', result.error);
    }
    return result;
};
