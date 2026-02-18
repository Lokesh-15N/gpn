// Example: How to integrate WhatsApp into userController.js

// 1. Import WhatsApp service at the top of userController.js
import { sendAppointmentConfirmation, sendAppointmentCancellation } from '../services/whatsappService.js';

// 2. Updated bookAppointment function with WhatsApp integration
const bookAppointment = async (req, res) => {
    try {
        const { userId, docId, slotDate, slotTime } = req.body
        const docData = await doctorModel.findById(docId).select("-password")

        if (!docData.available) {
            return res.json({ success: false, message: 'Doctor Not Available' })
        }

        let slots_booked = docData.slots_booked

        // checking for slot availablity
        if (slots_booked[slotDate]) {
            if (slots_booked[slotDate].includes(slotTime)) {
                return res.json({ success: false, message: 'Slot Not Available' })
            }
            else {
                slots_booked[slotDate].push(slotTime)
            }
        } else {
            slots_booked[slotDate] = []
            slots_booked[slotDate].push(slotTime)
        }

        const userData = await userModel.findById(userId).select("-password")

        delete docData.slots_booked

        const appointmentData = {
            userId,
            docId,
            userData,
            docData,
            amount: docData.fees,
            slotTime,
            slotDate,
            date: Date.now()
        }

        const newAppointment = new appointmentModel(appointmentData)
        await newAppointment.save()

        // save new slots data in docData
        await doctorModel.findByIdAndUpdate(docId, { slots_booked })

        // ============ WHATSAPP INTEGRATION STARTS HERE ============
        // Send WhatsApp confirmation (if phone number exists)
        if (userData.phone) {
            // Format the slot date for better readability
            const formattedDate = slotDate.split('_').join(' ');

            // Send WhatsApp message asynchronously (don't wait for it)
            sendAppointmentConfirmation(
                userData.phone,
                userData.name,
                docData.name,
                formattedDate,
                slotTime
            ).then(result => {
                if (result.success) {
                    console.log(`WhatsApp sent to ${userData.name} at ${userData.phone}`);
                } else {
                    console.log(`WhatsApp failed for ${userData.name}: ${result.error}`);
                }
            }).catch(err => {
                console.error('WhatsApp error:', err);
            });
        } else {
            console.log('No phone number found for user:', userData.name);
        }
        // ============ WHATSAPP INTEGRATION ENDS HERE ============

        res.json({ success: true, message: 'Appointment Booked' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// 3. Updated cancelAppointment function with WhatsApp integration
const cancelAppointment = async (req, res) => {
    try {
        const { userId, appointmentId } = req.body
        const appointmentData = await appointmentModel.findById(appointmentId)

        // verify appointment user
        if (appointmentData.userId !== userId) {
            return res.json({ success: false, message: 'Unauthorized action' })
        }

        await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true })

        // releasing doctor slot
        const { docId, slotDate, slotTime } = appointmentData

        const doctorData = await doctorModel.findById(docId)

        let slots_booked = doctorData.slots_booked

        slots_booked[slotDate] = slots_booked[slotDate].filter(e => e !== slotTime)

        await doctorModel.findByIdAndUpdate(docId, { slots_booked })

        // ============ WHATSAPP CANCELLATION NOTIFICATION ============
        // Get user data to send cancellation message
        const userData = await userModel.findById(userId).select("-password")

        if (userData.phone) {
            const formattedDate = slotDate.split('_').join(' ');

            sendAppointmentCancellation(
                userData.phone,
                userData.name,
                doctorData.name,
                formattedDate,
                slotTime
            ).then(result => {
                if (result.success) {
                    console.log(`Cancellation WhatsApp sent to ${userData.name}`);
                }
            }).catch(err => {
                console.error('WhatsApp cancellation error:', err);
            });
        }
        // ============ WHATSAPP CANCELLATION ENDS HERE ============

        res.json({ success: true, message: 'Appointment Cancelled' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// 4. OPTIONAL: Add Schedule Reminder Function (call this via cron job)
// This should be called 24 hours before appointment
const sendAppointmentReminders = async () => {
    try {
        // Get tomorrow's date
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDate = tomorrow.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).split(' ').join('_');

        // Find all appointments for tomorrow that are not cancelled
        const appointments = await appointmentModel.find({
            slotDate: tomorrowDate,
            cancelled: false,
            payment: true // Only send reminders for paid appointments
        });

        // Send reminder for each appointment
        for (const appointment of appointments) {
            const userData = await userModel.findById(appointment.userId);
            const docData = await doctorModel.findById(appointment.docId);

            if (userData.phone) {
                await sendAppointmentReminder(
                    userData.phone,
                    userData.name,
                    docData.name,
                    appointment.slotDate.split('_').join(' '),
                    appointment.slotTime
                );
            }
        }

        console.log(`Sent ${appointments.length} appointment reminders`);
    } catch (error) {
        console.error('Error sending reminders:', error);
    }
}

// 5. Add cron job to send reminders (install: npm install node-cron)
// Add this to server.js or create a separate scheduler.js
/*
import cron from 'node-cron';

// Run every day at 9 AM
cron.schedule('0 9 * * *', () => {
    console.log('Running appointment reminder task...');
    sendAppointmentReminders();
});
*/

export {
    bookAppointment,
    cancelAppointment,
    sendAppointmentReminders // Export for cron job
}
