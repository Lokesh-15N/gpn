# ⚡ Twilio SMS - Configuration Checklist

## 🎯 Your Integration is Complete!

All code is ready. Just add your Twilio credentials to start sending SMS.

---

## 📝 Quick Setup (3 Steps)

### ✅ Step 1: Get Twilio Credentials

1. **Sign up at**: https://www.twilio.com/try-twilio
2. **Get $15 free credit** (500+ SMS messages)
3. **Copy from dashboard**:
   - Account SID (starts with "AC...")
   - Auth Token
4. **Get a phone number**:
   - Go to Phone Numbers → Buy a number
   - Copy the number (format: +1234567890)

### ✅ Step 2: Update .env File

Open `backend/.env` and update these lines:

```env
# Twilio SMS Integration with Alpha Sender
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_actual_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_ALPHA_SENDER=DOCSlot
```

**Replace with your actual values!**

### ✅ Step 3: Restart Backend

```bash
cd backend
npm start
```

**Look for**: `✅ Twilio SMS Service initialized`

---

## 🧪 Test It Now!

1. **Update user phone number** in the database (or profile page)
2. **Book an appointment** from frontend
3. **Check SMS** - Patient receives confirmation!

---

## 📱 What's Integrated?

### ✅ Appointment Booking
When patient books appointment → **SMS sent automatically**

```javascript
// backend/controllers/userController.js (Line ~195)
// Already integrated! No code changes needed.
```

### ✅ Appointment Cancellation
When appointment cancelled → **Cancellation SMS sent**

```javascript
// backend/controllers/userController.js (Line ~240)
// Already integrated! No code changes needed.
```

---

## 🎨 Alpha Sender Setup (Optional)

**Alpha Sender makes SMS show "DOCSlot" instead of phone number**

### Option A: Use Alpha Sender (Recommended)
1. In Twilio Console → **Messaging** → **Services**
2. Create Messaging Service
3. Add Alpha Sender ID: **DOCSlot**
4. In `.env`, keep: `TWILIO_ALPHA_SENDER=DOCSlot`

### Option B: Use Phone Number Only
1. In `.env`, comment out or remove:
   ```env
   # TWILIO_ALPHA_SENDER=DOCSlot
   ```
2. SMS will show from your Twilio phone number

---

## 🔍 Important Notes

### Phone Number Format
Users must have valid phone numbers:
- ✅ Correct: `+919876543210` or `9876543210`
- ❌ Wrong: `000000000` (default value)

### Trial Account Limits
Twilio trial accounts can only send to **verified phone numbers**:
1. Verify numbers in Twilio Console first, OR
2. Upgrade to paid account (no trial limits)

### Pricing After Free Credit
- ~$0.0075 per SMS in India
- International rates vary
- Check: https://www.twilio.com/sms/pricing

---

## 📂 Files Modified

### ✅ Created Files:
- `backend/services/twilioSmsService.js` - SMS sending logic
- `TWILIO_SMS_SETUP.md` - Detailed setup guide
- `TWILIO_QUICKSTART.md` - This file

### ✅ Updated Files:
- `backend/.env` - Added Twilio configuration
- `backend/controllers/userController.js` - Integrated SMS on booking/cancellation
- `backend/package.json` - Added Twilio dependency

---

## 🐛 Troubleshooting

### SMS not sending?

**Check 1**: Console logs
```bash
✅ Twilio SMS sent successfully  # Should see this
```

**Check 2**: Phone number format
- Must be +919876543210 (with country code)
- Cannot be 000000000

**Check 3**: Twilio credentials
- SID starts with "AC"
- Auth Token is correct
- Phone number matches Twilio account

**Check 4**: Trial account
- Verify recipient phone in Twilio Console, OR
- Upgrade to paid account

---

## 🎯 Next Steps

1. ✅ Get Twilio Account SID & Auth Token
2. ✅ Get Twilio Phone Number
3. ✅ Update `backend/.env` with credentials
4. ✅ Restart backend: `npm start`
5. ✅ Test booking appointment
6. ✅ Check phone for SMS!

---

## 💡 Additional Features Available

The SMS service includes more functions you can use:

```javascript
// In backend/services/twilioSmsService.js
sendAppointmentReminder()  // Send day-before reminders
sendPaymentConfirmation()  // Send payment receipts
sendOTP()                  // Send verification codes
```

---

## 📞 Support

- **Twilio Docs**: https://www.twilio.com/docs/sms
- **Console**: https://console.twilio.com/
- **Status Page**: https://status.twilio.com/

---

**🎉 You're all set! Just add your credentials and start sending SMS!**
