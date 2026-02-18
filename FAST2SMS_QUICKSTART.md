# Quick Setup: SMS Notifications with Fast2SMS

## ⚡ 3-Minute Setup Guide

### Why Fast2SMS?
- ✅ Easiest to setup (no verification needed for testing)
- ✅ 50 FREE SMS on signup
- ✅ ₹0.15 per SMS (very cheap)
- ✅ Works immediately (no waiting for approval)
- ✅ Perfect for India

---

## 🚀 Step 1: Get API Key (2 minutes)

1. Go to: **https://www.fast2sms.com/**
2. Click "Sign Up" (top right)
3. Complete registration (takes 1 min)
4. Go to **Dashboard → Dev API**
5. Copy your **API Key** (looks like: "aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890")

---

## 🔧 Step 2: Install Package

```bash
cd backend
npm install axios
```

(axios is probably already installed)

---

## ⚙️ Step 3: Configure Environment

Edit `backend/.env` and add this line:

```env
FAST2SMS_API_KEY=paste_your_api_key_here
```

Example:
```env
FAST2SMS_API_KEY=aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890
```

---

## 📝 Step 4: Use the Service

The service file is already created at `backend/services/smsService.js`

### Integration in Your Controller

Edit `backend/controllers/userController.js`:

#### Add Import at Top:
```javascript
import { sendAppointmentConfirmation, sendAppointmentCancellation } from '../services/smsService.js';
```

#### In `bookAppointment` Function:

Add this AFTER saving the appointment (around line 181):

```javascript
// Send SMS notification
if (userData.phone) {
    const formattedDate = slotDate.split('_').join(' ');
    sendAppointmentConfirmation(
        userData.phone,
        userData.name,
        docData.name,
        formattedDate,
        slotTime
    ).then(result => {
        if (result.success) {
            console.log(`✅ SMS sent to ${userData.name}`);
        } else {
            console.log(`❌ SMS failed: ${result.error}`);
        }
    }).catch(err => console.error('SMS error:', err));
}
```

#### In `cancelAppointment` Function:

Add this AFTER cancelling the appointment (around line 215):

```javascript
// Send cancellation SMS
const userData = await userModel.findById(userId).select("-password");
const doctorData = await doctorModel.findById(docId);

if (userData.phone) {
    const formattedDate = slotDate.split('_').join(' ');
    sendAppointmentCancellation(
        userData.phone,
        userData.name,
        doctorData.name,
        formattedDate,
        slotTime
    ).catch(err => console.error('SMS error:', err));
}
```

---

## 🧪 Step 5: Test It!

1. **Restart your backend server**:
   ```bash
   cd backend
   npm start
   ```

2. **Book an appointment** through your app with your phone number

3. **Check:**
   - Your phone for SMS
   - Backend console for success message
   - Fast2SMS dashboard for delivery status

---

## 📱 SMS Message Examples

### When Appointment is Booked:
```
Hi John! Your appointment with Dr. Smith is confirmed for 20 Feb 2026 at 10:00 AM. Please arrive 10 mins early. -DOCSlot
```

### When Appointment is Cancelled:
```
Hi John, appointment with Dr. Smith on 20 Feb 2026 at 10:00 AM has been cancelled. Visit us to reschedule. -DOCSlot
```

---

## ⚠️ Important Notes

### Phone Number Format:
Fast2SMS works with **10-digit Indian numbers**. The service automatically handles these formats:
- ✅ `9876543210` (perfect)
- ✅ `+919876543210` (will be cleaned to 9876543210)
- ✅ `919876543210` (will be cleaned to 9876543210)

### Message Length:
- Single SMS: Up to 160 characters
- Long message: Costs 2-3 SMS (auto-split)

### Free Credits:
- You get 50 FREE SMS on signup
- Perfect for testing!
- After that: ₹0.15 per SMS

---

## 🔍 Troubleshooting

### SMS not sending?

1. **Check API Key**: Make sure it's correct in `.env`
2. **Restart Backend**: After adding API key, restart `npm start`
3. **Check Phone**: Must be 10 digits
4. **Check Credits**: Log into Fast2SMS dashboard to see credit balance
5. **Check Console**: Look for error messages in backend console

### "SMS not configured" message?

Make sure:
- `FAST2SMS_API_KEY` is in `backend/.env`
- Key has no extra spaces or quotes
- Backend server was restarted after adding key

### Phone number invalid?

The service needs 10-digit numbers. If you have international numbers, update your user registration to use Indian format.

---

## 💰 Pricing & Recharge

### Current Rate:
- ₹0.15 per SMS (very cheap!)
- Example: 1000 SMS = ₹150

### Recharge:
1. Go to Fast2SMS dashboard
2. Click "Recharge"
3. Choose amount (minimum ₹100)
4. Pay via UPI/Card/Net Banking

---

## 🎯 Next Steps (Optional)

### 1. Add Phone Field to Frontend

Edit `frontend/src/pages/Login.jsx` (registration form):

```jsx
<input
    type="tel"
    placeholder="Phone Number (10 digits)"
    value={phone}
    onChange={(e) => setPhone(e.target.value)}
    pattern="[0-9]{10}"
    required
/>
```

### 2. Add Appointment Reminders

Install cron job package:
```bash
npm install node-cron
```

In `server.js`:
```javascript
import cron from 'node-cron';
import { sendAppointmentReminder } from './services/smsService.js';

// Send reminders every day at 9 AM
cron.schedule('0 9 * * *', async () => {
    // Find tomorrow's appointments
    // Send reminder SMS to each patient
});
```

### 3. Add Payment Confirmation SMS

In your payment success handler:
```javascript
import { sendPaymentConfirmation } from './services/smsService.js';

await sendPaymentConfirmation(userData.phone, userData.name, amount, date);
```

---

## ✅ Checklist

- [ ] Signed up at Fast2SMS.com
- [ ] Got API key from dashboard
- [ ] Added `FAST2SMS_API_KEY` to `.env`
- [ ] Restarted backend server
- [ ] Added SMS code to `bookAppointment` function
- [ ] Tested booking with your phone number
- [ ] Received SMS!

---

## 🎉 You're Done!

Your patients will now receive SMS notifications automatically when they:
- ✅ Book an appointment
- ✅ Cancel an appointment
- ✅ (Optional) 24 hours before appointment
- ✅ (Optional) After payment

**Total Setup Time: 3-5 minutes!**

---

## 📚 Full Documentation

See `SMS_WHATSAPP_ALTERNATIVES.md` for:
- Other providers (MSG91, Vonage, MessageBird)
- WhatsApp integration
- International solutions
- Advanced features

---

## 🆘 Need Help?

Common issues:
1. "Cannot find module 'axios'" → Run `npm install axios`
2. "SMS not configured" → Add API key to `.env` and restart
3. No SMS received → Check phone number format (must be 10 digits)
4. "Insufficient balance" → Recharge at Fast2SMS dashboard

Good luck! 🚀
