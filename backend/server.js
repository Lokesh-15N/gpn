import express from "express"
import cors from 'cors'
import 'dotenv/config'
import { fileURLToPath } from 'url'
import path from 'path'
import cron from 'node-cron'
import connectDB from "./config/mongodb.js"
import connectCloudinary from "./config/cloudinary.js"
import userRouter from "./routes/userRoute.js"
import doctorRouter from "./routes/doctorRoute.js"
import adminRouter from "./routes/adminRoute.js"
import appointmentModel from "./models/appointmentModel.js"
import { sendAppointmentReminderTelegram } from "./services/telegramService.js"

// app config
const app = express()
const port = process.env.PORT || 4000
connectDB()
connectCloudinary()

// middlewares
app.use(express.json())
app.use(cors())

// Serve static doctor images from backend/public/images
const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)
app.use('/images', express.static(path.join(__dirname, 'public/images')))

// api endpoints
app.use("/api/user", userRouter)
app.use("/api/admin", adminRouter)
app.use("/api/doctor", doctorRouter)

app.get("/", (req, res) => {
  res.send("API Working")
});

// ─── 1-hour appointment reminder cron job ────────────────────────────────────
// Runs every minute, finds appointments starting in 55–65 minutes, sends reminder
cron.schedule('* * * * *', async () => {
    try {
        const now = new Date();

        // Build the target window: 55 to 65 minutes from now
        const windowStart = new Date(now.getTime() + 55 * 60 * 1000);
        const windowEnd   = new Date(now.getTime() + 65 * 60 * 1000);

        // Fetch all upcoming, non-cancelled, non-completed appointments
        const appointments = await appointmentModel.find({
            cancelled: false,
            isCompleted: false,
            reminderSent: { $ne: true },
        });

        for (const appt of appointments) {
            try {
                // slotDate format: "DD_MM_YYYY", slotTime: "10:00 AM" / "10:00 am"
                const [day, month, year] = appt.slotDate.split('_').map(Number);

                // Parse slotTime (e.g. "10:00 AM", "02:30 PM", "14:00")
                let hours = 0, minutes = 0;
                const timeStr = appt.slotTime.trim();
                const match12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
                const match24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);

                if (match12) {
                    hours   = parseInt(match12[1]);
                    minutes = parseInt(match12[2]);
                    const period = match12[3].toUpperCase();
                    if (period === 'PM' && hours !== 12) hours += 12;
                    if (period === 'AM' && hours === 12) hours = 0;
                } else if (match24) {
                    hours   = parseInt(match24[1]);
                    minutes = parseInt(match24[2]);
                }

                const apptDateTime = new Date(year, month - 1, day, hours, minutes, 0);

                if (apptDateTime >= windowStart && apptDateTime <= windowEnd) {
                    const patientName = appt.userData?.name || 'Patient';
                    const doctorName  = appt.docData?.name  || 'Doctor';

                    await sendAppointmentReminderTelegram(
                        patientName,
                        doctorName,
                        appt.slotDate,
                        appt.slotTime
                    );

                    // Mark reminder sent so we don't send it again
                    await appointmentModel.findByIdAndUpdate(appt._id, { reminderSent: true });
                }
            } catch (err) {
                console.error('Reminder parse error for appt', appt._id, err.message);
            }
        }
    } catch (err) {
        console.error('Cron reminder job error:', err.message);
    }
});

console.log('🕐 Appointment reminder cron job started (checks every minute)');
// ─────────────────────────────────────────────────────────────────────────────

app.listen(port, () => console.log(`Server started on PORT:${port}`))
