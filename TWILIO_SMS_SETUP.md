# 🚀 Twilio SMS Integration - Quick Setup Guide

## ✅ What's Already Done

Your DOCSlot website is now integrated with Twilio SMS service! The following features are ready:

- ✅ Automatic SMS on appointment booking
- ✅ SMS notification on appointment cancellation
- ✅ Alpha Sender support (SMS appears from "DOCSlot" instead of a phone number)
- ✅ Smart phone number formatting (handles Indian numbers)
- ✅ Error handling and logging

## 📋 Setup Steps (5 minutes)

### Step 1: Create Twilio Account

1. Go to https://www.twilio.com/try-twilio
2. Sign up for a free account
3. You'll get **$15 free credit** (enough for ~500 SMS)

### Step 2: Get Your Credentials

1. Go to Twilio Console: https://console.twilio.com/
2. Find your **Account SID** and **Auth Token** on the dashboard
3. Copy these values

### Step 3: Get a Phone Number

1. In Twilio Console, go to **Phone Numbers** → **Manage** → **Buy a number**
2. Select your country (India recommended)
3. Buy a number (uses your free credit)
4. Copy the phone number (format: +1234567890)

### Step 4: Configure Alpha Sender (Optional but Recommended)

**For Alpha Sender (SMS shows "DOCSlot" instead of phone number):**

1. Go to **Messaging** → **Services**
2. Create a new Messaging Service
3. Under **Sender Pool**, add your Alpha Sender ID: **DOCSlot**
4. Note: Alpha Sender may require verification in some countries

**Alternative**: Skip alpha sender and use your Twilio phone number

### Step 5: Update .env File

Open `backend/.env` and add your Twilio credentials:

```env
# Twilio SMS Integration with Alpha Sender
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_ALPHA_SENDER=DOCSlot
```

**Replace:**
- `ACxxxxxxxx...` with your actual Account SID
- `your_auth_token_here` with your Auth Token
- `+1234567890` with your Twilio phone number
- Keep `DOCSlot` as alpha sender (or change if you prefer)

### Step 6: Install Twilio Package

Open terminal in `backend` folder and run:

```bash
npm install twilio
```

### Step 7: Restart Backend Server

```bash
npm start
```

You should see: `✅ Twilio SMS Service initialized`

## 🧪 Test the Integration

### Test 1: Book an Appointment

1. Make sure a user has a valid phone number in their profile
2. Book an appointment from the frontend
3. Check the backend console logs for:
   ```
   ✅ Twilio SMS sent successfully
   To: +919876543210
   From: DOCSlot
   ```
4. The patient should receive SMS on their phone!

### Test 2: Cancel an Appointment

1. Cancel any appointment
2. Patient should receive cancellation SMS

## 📱 Important: Add Phone Numbers

Users must have valid phone numbers to receive SMS. Update your registration/profile forms to collect phone numbers.

**Current phone field in user model:**
```javascript
phone: { type: String, default: '000000000' }
```

Make sure users update their phone number in their profile!

## 💰 Pricing

- **Free Trial**: $15 credit (~500 SMS)
- **After Trial**: ~$0.0075 per SMS in India
- **Alpha Sender**: May have additional costs
- Check pricing: https://www.twilio.com/sms/pricing

## 🔧 Configuration Options

### Option 1: Alpha Sender (Recommended)
Shows "DOCSlot" as sender name
```env
TWILIO_ALPHA_SENDER=DOCSlot
```

### Option 2: Phone Number Only
Shows your Twilio number as sender
```env
# Leave TWILIO_ALPHA_SENDER commented or empty
```

## 📝 What Messages Are Sent?

### Appointment Confirmation
```
Hi John Doe! Your appointment with Dr. Smith is confirmed for 2024-03-15 at 10:00 AM. Please arrive 10 mins early. - DOCSlot
```

### Appointment Cancellation
```
Hi John Doe, your appointment with Dr. Smith on 2024-03-15 at 10:00 AM has been cancelled. Visit our website to reschedule. - DOCSlot
```

## 🐛 Troubleshooting

### SMS Not Sending?

1. **Check Console Logs**: Look for error messages in backend terminal
2. **Verify Credentials**: Make sure SID and Token are correct
3. **Check Phone Format**: Must be in format +919876543210
4. **Trial Account Limitation**: Twilio trial accounts can only send to verified numbers
   - Go to console and verify phone numbers first
   - Or upgrade to paid account to send to any number

### Error Codes

- `21211`: Invalid 'To' phone number
- `21608`: Not verified (trial account)
- `20003`: Authentication error (wrong SID/Token)

### Still Not Working?

Check backend console for detailed error logs:
```javascript
❌ Twilio SMS error: [error message]
   Error Code: [error code]
```

## 🎯 Next Steps

1. ✅ Install twilio package: `npm install twilio`
2. ✅ Add credentials to `.env`
3. ✅ Restart backend server
4. ✅ Test with a booking
5. ✅ Update user profiles with phone numbers

## 📚 Additional Features (Optional)

Want to add more SMS features? The service includes:

- `sendAppointmentReminder()` - Send reminders before appointments
- `sendPaymentConfirmation()` - Send payment receipts
- `sendOTP()` - Send verification codes

Check `backend/services/twilioSmsService.js` for all available functions!

---

**Need Help?** Visit https://www.twilio.com/docs/sms
