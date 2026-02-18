# WhatsApp Integration Guide for DOCSlot

## Overview
This guide explains how to implement WhatsApp messaging service to send appointment confirmation messages to patients after they schedule an appointment.

## Option 1: Twilio WhatsApp API (Recommended for Production)

### Prerequisites
1. Twilio Account (Sign up at https://www.twilio.com/)
2. WhatsApp Business Account (approved by Twilio)
3. Phone numbers verified with Twilio

### Step 1: Install Twilio SDK
```bash
cd backend
npm install twilio
```

### Step 2: Set up Twilio Credentials
Add to your `backend/.env` file:
```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

### Step 3: Create WhatsApp Service
Create `backend/services/whatsappService.js`:
```javascript
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

const sendWhatsAppMessage = async (to, message) => {
    try {
        const result = await client.messages.create({
            body: message,
            from: process.env.TWILIO_WHATSAPP_NUMBER,
            to: `whatsapp:${to}`
        });
        console.log('WhatsApp message sent:', result.sid);
        return { success: true, messageId: result.sid };
    } catch (error) {
        console.error('WhatsApp error:', error);
        return { success: false, error: error.message };
    }
};

// Format appointment confirmation message
const formatAppointmentMessage = (patientName, doctorName, date, time, slotDate) => {
    return `🏥 *DOCSlot Appointment Confirmation*

Hello ${patientName}! 👋

Your appointment has been successfully scheduled.

📋 *Appointment Details:*
👨‍⚕️ Doctor: Dr. ${doctorName}
📅 Date: ${slotDate}
🕐 Time: ${time}

Please arrive 10 minutes early for registration.

For any changes, please contact us or visit our website.

Thank you for choosing DOCSlot! 🙏`;
};

export { sendWhatsAppMessage, formatAppointmentMessage };
```

### Step 4: Update User Controller
Modify `backend/controllers/userController.js`:
```javascript
import { sendWhatsAppMessage, formatAppointmentMessage } from '../services/whatsappService.js';

// In bookAppointment function, after saving appointment:
const bookAppointment = async (req, res) => {
    try {
        const { userId, docId, slotDate, slotTime } = req.body;

        // ... existing appointment booking code ...

        await newAppointment.save();

        // Send WhatsApp notification
        const userData = await userModel.findById(userId);
        const docData = await doctorModel.findById(docId);

        if (userData.phone) {
            const message = formatAppointmentMessage(
                userData.name,
                docData.name,
                new Date().toLocaleDateString(),
                slotTime,
                slotDate
            );

            await sendWhatsAppMessage(userData.phone, message);
        }

        res.json({ success: true, message: 'Appointment Booked and WhatsApp notification sent' });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};
```

### Step 5: Add Phone Field to User Model
Update `backend/models/userModel.js`:
```javascript
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, required: true }, // Add this
    image: { type: String, default: '' },
    address: { type: Object, default: { line1: '', line2: '' } },
    gender: { type: String, default: 'Not Selected' },
    dob: { type: String, default: '2000-01-01' },
    date: { type: Number }
});
```

---

## Option 2: WhatsApp Business API (Official)

### Prerequisites
1. Facebook Business Manager Account
2. WhatsApp Business Account approved by Meta
3. Dedicated phone number

### Implementation Steps:
1. Apply for WhatsApp Business API access through Meta
2. Get approved (can take several days/weeks)
3. Use WhatsApp Cloud API
4. Install official SDK: `npm install whatsapp-web.js`

### Basic Implementation:
```javascript
import { Client, LocalAuth } from 'whatsapp-web.js';

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
    // Generate QR code for authentication
    console.log('QR RECEIVED', qr);
});

client.on('ready', () => {
    console.log('WhatsApp Client is ready!');
});

const sendMessage = async (number, message) => {
    try {
        await client.sendMessage(`${number}@c.us`, message);
        return { success: true };
    } catch (error) {
        console.error('Error:', error);
        return { success: false, error };
    }
};

client.initialize();
```

---

## Option 3: Third-Party WhatsApp APIs (Easy & Quick)

### A. Wati.io
- Simple dashboard
- Template management
- Good pricing for startups
- Install: `npm install axios`

```javascript
import axios from 'axios';

const sendWatiMessage = async (phoneNumber, templateName, parameters) => {
    const url = 'https://live-server-XXXX.wati.io/api/v1/sendTemplateMessage';

    const data = {
        whatsappNumber: phoneNumber,
        template_name: templateName,
        broadcast_name: 'appointment_confirmation',
        parameters: parameters
    };

    try {
        const response = await axios.post(url, data, {
            headers: {
                'Authorization': `Bearer ${process.env.WATI_API_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        return { success: true, data: response.data };
    } catch (error) {
        console.error('Wati Error:', error);
        return { success: false, error: error.message };
    }
};
```

### B. Gupshup
### C. 2Chat

---

## Implementation Checklist

### Backend Changes:
- [ ] Install WhatsApp service package (Twilio/other)
- [ ] Add WhatsApp credentials to `.env`
- [ ] Create `whatsappService.js` file
- [ ] Update User Model to include phone number
- [ ] Modify `bookAppointment` function to send WhatsApp message
- [ ] Add error handling for WhatsApp failures
- [ ] Test with sandbox number first

### Frontend Changes:
- [ ] Add phone number field to user registration
- [ ] Add phone number field to profile update
- [ ] Add phone validation
- [ ] Update MyProfile.jsx to include phone input

### Example Frontend Phone Field:
```jsx
// In MyProfile.jsx or Register component
<div className='flex-1 flex flex-col gap-1'>
    <p>Phone Number</p>
    <input
        onChange={e => setPhone(e.target.value)}
        value={phone}
        className='border rounded px-3 py-2'
        type="tel"
        placeholder='+1234567890'
        pattern="[+][0-9]{1,4}[0-9]{10}"
        required
    />
</div>
```

---

## Testing

### Twilio Sandbox Testing:
1. Go to Twilio Console > WhatsApp > Sandbox
2. Follow instructions to join sandbox
3. Send test message: `join [your-sandbox-code]`
4. Use sandbox number for testing

### Test Message Function:
```javascript
// Test in your backend
const testWhatsAppMessage = async () => {
    const message = "Test message from DOCSlot!";
    const result = await sendWhatsAppMessage('+1234567890', message);
    console.log('Test result:', result);
};
```

---

## Production Considerations

1. **Rate Limits**: Monitor WhatsApp API rate limits
2. **Templates**: Use approved message templates for marketing
3. **Opt-in**: Get user consent to receive WhatsApp messages
4. **Cost**: Account for per-message costs in your budget
5. **Fallback**: Implement SMS/email fallback if WhatsApp fails
6. **Logging**: Log all message attempts for debugging
7. **Queue**: Use message queue (Redis/Bull) for high volume

---

## Pricing Comparison

| Service | Free Tier | Paid |
|---------|-----------|------|
| Twilio | 1,000 free messages | $0.005/message |
| Wati.io | 1,000 messages/month | $49/month |
| WhatsApp Business API | No free tier | $0.005-0.02/message |
| Gupshup | Trial available | Custom pricing |

---

## Recommended Approach

**For MVP/Testing**: Use Twilio WhatsApp Sandbox (Free)
**For Production**:
- Small scale (< 10,000 msgs/month): Wati.io
- Large scale: Twilio or Official WhatsApp Business API

---

## Additional Features to Implement

1. **Appointment Reminders**: Send reminder 24 hours before appointment
2. **Cancellation Notifications**: Notify patients when appointment is cancelled
3. **Doctor Updates**: Notify if doctor is running late
4. **Payment Confirmations**: Send payment receipts via WhatsApp
5. **Follow-up Messages**: Post-appointment follow-up

---

## Sample Complete Implementation

See the example files:
- `backend/services/whatsappService.js` - WhatsApp service
- `backend/services/notificationService.js` - Unified notification handler
- Update `userController.js` - Integrate into booking flow

## Support
For issues or questions about WhatsApp integration, refer to:
- Twilio Docs: https://www.twilio.com/docs/whatsapp
- WhatsApp Business API: https://developers.facebook.com/docs/whatsapp
