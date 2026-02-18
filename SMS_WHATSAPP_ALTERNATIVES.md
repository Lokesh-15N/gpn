# Alternative SMS & WhatsApp Services (Twilio Alternatives)

## Best Alternatives for Both WhatsApp + SMS

---

## 1. ⭐ MSG91 (Highly Recommended for India)

**Why MSG91:**
- 🇮🇳 Based in India - Better for Indian numbers
- 💰 Very affordable pricing
- 📱 Both SMS and WhatsApp support
- ✅ Easy setup and good documentation
- 🎁 Free trial credits available

### Setup MSG91

#### Step 1: Sign Up
- Go to: https://msg91.com/
- Sign up for free account
- Get ₹50 free credits

#### Step 2: Install Package
```bash
cd backend
npm install msg91-nodejs
```

#### Step 3: Add to `.env`
```env
MSG91_AUTH_KEY=your_auth_key_here
MSG91_SENDER_ID=DOCSLOT
MSG91_ROUTE=4
MSG91_WHATSAPP_TEMPLATE_ID=your_template_id
```

#### Step 4: Create Service File
Create `backend/services/msg91Service.js`:

```javascript
import msg91 from 'msg91-nodejs';

// Initialize MSG91
const authKey = process.env.MSG91_AUTH_KEY;
const senderId = process.env.MSG91_SENDER_ID;
const route = process.env.MSG91_ROUTE || '4';

// Initialize client
if (authKey) {
    msg91.initialize({ authKey });
}

/**
 * Send SMS using MSG91
 */
const sendSMS = async (phoneNumber, message) => {
    try {
        if (!authKey) {
            console.log('MSG91 not configured. Skipping SMS.');
            return { success: false, error: 'MSG91 not configured' };
        }

        const result = await msg91.sendSMS({
            route: route,
            sender: senderId,
            mobiles: phoneNumber, // Format: 91XXXXXXXXXX
            message: message,
            DLT_TE_ID: process.env.MSG91_DLT_TEMPLATE_ID // For DLT compliance
        });

        console.log('SMS sent successfully:', result);
        return { success: true, data: result };

    } catch (error) {
        console.error('SMS error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Send WhatsApp using MSG91
 */
const sendWhatsApp = async (phoneNumber, templateData) => {
    try {
        if (!authKey) {
            console.log('MSG91 not configured. Skipping WhatsApp.');
            return { success: false, error: 'MSG91 not configured' };
        }

        // MSG91 WhatsApp requires template-based messaging
        const result = await msg91.sendWhatsAppTemplate({
            mobiles: phoneNumber, // Format: 91XXXXXXXXXX
            templateId: process.env.MSG91_WHATSAPP_TEMPLATE_ID,
            ...templateData
        });

        console.log('WhatsApp sent successfully:', result);
        return { success: true, data: result };

    } catch (error) {
        console.error('WhatsApp error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Send Appointment Confirmation via SMS
 */
const sendAppointmentSMS = async (phoneNumber, patientName, doctorName, date, time) => {
    const message = `Hi ${patientName}! Your appointment with Dr. ${doctorName} is confirmed for ${date} at ${time}. Please arrive 10 mins early. - DOCSlot`;
    return await sendSMS(phoneNumber, message);
};

export {
    sendSMS,
    sendWhatsApp,
    sendAppointmentSMS
};
```

---

## 2. 📱 Vonage (Nexmo) - International Solution

**Why Vonage:**
- 🌍 Global coverage
- 📞 Voice, SMS, WhatsApp all-in-one
- 💳 €2 free credit on signup
- 📚 Excellent documentation

### Setup Vonage

#### Install
```bash
npm install @vonage/server-sdk
```

#### Configuration
```env
VONAGE_API_KEY=your_api_key
VONAGE_API_SECRET=your_api_secret
VONAGE_WHATSAPP_NUMBER=your_whatsapp_number
```

#### Implementation
```javascript
import { Vonage } from '@vonage/server-sdk';

const vonage = new Vonage({
    apiKey: process.env.VONAGE_API_KEY,
    apiSecret: process.env.VONAGE_API_SECRET
});

// Send SMS
const sendSMS = async (to, text) => {
    try {
        const response = await vonage.sms.send({
            to: to,
            from: 'DOCSLOT',
            text: text
        });
        return { success: true, data: response };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Send WhatsApp
const sendWhatsApp = async (to, text) => {
    try {
        const response = await vonage.messages.send({
            to: to,
            from: process.env.VONAGE_WHATSAPP_NUMBER,
            message_type: 'text',
            text: text,
            channel: 'whatsapp'
        });
        return { success: true, data: response };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export { sendSMS, sendWhatsApp };
```

---

## 3. 🐦 MessageBird - Europe-based

**Website:** https://messagebird.com/
**Free Trial:** €10 credit

### Install
```bash
npm install messagebird
```

### Implementation
```javascript
import messagebird from 'messagebird';

const client = messagebird(process.env.MESSAGEBIRD_API_KEY);

const sendSMS = (to, body) => {
    return new Promise((resolve, reject) => {
        client.messages.create({
            originator: 'DOCSLOT',
            recipients: [to],
            body: body
        }, (err, response) => {
            if (err) reject(err);
            else resolve(response);
        });
    });
};
```

---

## 4. 📲 Gupshup - Popular in India

**Website:** https://www.gupshup.io/
**Best for:** High volume messaging in India

### Installation
```bash
npm install axios
```

### Implementation
```javascript
import axios from 'axios';

const GUPSHUP_API_KEY = process.env.GUPSHUP_API_KEY;
const GUPSHUP_APP_NAME = process.env.GUPSHUP_APP_NAME;

const sendWhatsApp = async (phoneNumber, message) => {
    try {
        const response = await axios.post(
            'https://api.gupshup.io/sm/api/v1/msg',
            {
                channel: 'whatsapp',
                source: GUPSHUP_APP_NAME,
                destination: phoneNumber,
                message: JSON.stringify({
                    type: 'text',
                    text: message
                }),
                'src.name': GUPSHUP_APP_NAME
            },
            {
                headers: {
                    'apikey': GUPSHUP_API_KEY,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

const sendSMS = async (phoneNumber, message) => {
    try {
        const response = await axios.get(
            `https://enterprise.smsgupshup.com/GatewayAPI/rest?method=SendMessage&send_to=${phoneNumber}&msg=${encodeURIComponent(message)}&userid=${process.env.GUPSHUP_USERID}&password=${process.env.GUPSHUP_PASSWORD}&v=1.1&msg_type=TEXT&auth_scheme=plain`
        );
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export { sendWhatsApp, sendSMS };
```

---

## 5. 📧 2Factor (Indian SMS Provider)

**Website:** https://2factor.in/
**Pricing:** ₹0.18 per SMS (very cheap)

### Implementation
```javascript
import axios from 'axios';

const TWOFACTOR_API_KEY = process.env.TWOFACTOR_API_KEY;

const sendSMS = async (phoneNumber, message) => {
    try {
        const response = await axios.get(
            `https://2factor.in/API/V1/${TWOFACTOR_API_KEY}/ADDON_SERVICES/SEND/TSMS`,
            {
                params: {
                    Phone: phoneNumber,
                    Msg: message
                }
            }
        );
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export { sendSMS };
```

---

## 6. 🚀 Fast2SMS (Indian, Very Easy Setup)

**Website:** https://www.fast2sms.com/
**Free Credits:** 50 SMS free on signup

### Super Simple Implementation
```javascript
import axios from 'axios';

const sendSMS = async (phoneNumber, message) => {
    try {
        const response = await axios.post(
            'https://www.fast2sms.com/dev/bulkV2',
            {
                route: 'q',
                message: message,
                language: 'english',
                flash: 0,
                numbers: phoneNumber // Without country code, just 10 digits
            },
            {
                headers: {
                    'authorization': process.env.FAST2SMS_API_KEY
                }
            }
        );
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

const sendAppointmentSMS = async (phone, name, doctor, date, time) => {
    const msg = `Hi ${name}! Appointment with Dr. ${doctor} confirmed for ${date} at ${time}. -DOCSlot`;
    return await sendSMS(phone, msg);
};

export { sendSMS, sendAppointmentSMS };
```

---

## 📊 Comparison Table

| Service | SMS | WhatsApp | Free Trial | Best For | Pricing |
|---------|-----|----------|-----------|----------|---------|
| **MSG91** | ✅ | ✅ | ₹50 credits | India | ₹0.15-0.25/SMS |
| **Vonage** | ✅ | ✅ | €2 credit | Global | $0.0058/SMS |
| **MessageBird** | ✅ | ✅ | €10 credit | Europe | €0.065/SMS |
| **Gupshup** | ✅ | ✅ | Trial available | India (high volume) | Custom |
| **2Factor** | ✅ | ❌ | 10 SMS free | India | ₹0.18/SMS |
| **Fast2SMS** | ✅ | ❌ | 50 SMS free | India (simple) | ₹0.15/SMS |

---

## 🎯 Recommended Setup for Your Project

### For Indian Audience (Best Choice):
**Use MSG91 or Fast2SMS**

```env
# Option 1: MSG91 (Both SMS + WhatsApp)
MSG91_AUTH_KEY=your_auth_key
MSG91_SENDER_ID=DOCSLOT

# Option 2: Fast2SMS (SMS only, easiest)
FAST2SMS_API_KEY=your_api_key
```

### For Global Audience:
**Use Vonage or MessageBird**

---

## 🚀 Quick Implementation (Fast2SMS - Easiest)

### Complete Service File
Create `backend/services/smsService.js`:

```javascript
import axios from 'axios';

const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY;

/**
 * Send SMS using Fast2SMS
 */
const sendSMS = async (phoneNumber, message) => {
    try {
        if (!FAST2SMS_API_KEY) {
            console.log('Fast2SMS not configured');
            return { success: false, error: 'SMS not configured' };
        }

        // Extract 10 digits (remove +91 or other country codes)
        const cleanNumber = phoneNumber.replace(/[^0-9]/g, '').slice(-10);

        const response = await axios.post(
            'https://www.fast2sms.com/dev/bulkV2',
            {
                route: 'q',
                message: message,
                language: 'english',
                flash: 0,
                numbers: cleanNumber
            },
            {
                headers: {
                    'authorization': FAST2SMS_API_KEY
                }
            }
        );

        console.log('SMS sent successfully:', response.data);
        return { success: true, data: response.data };

    } catch (error) {
        console.error('SMS error:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Format and send appointment confirmation
 */
const sendAppointmentConfirmation = async (phone, patientName, doctorName, date, time) => {
    const message = `Hi ${patientName}! Your appointment with Dr. ${doctorName} is confirmed for ${date} at ${time}. Please arrive 10 minutes early. -DOCSlot`;
    return await sendSMS(phone, message);
};

/**
 * Format and send appointment cancellation
 */
const sendAppointmentCancellation = async (phone, patientName, doctorName, date, time) => {
    const message = `Hi ${patientName}, your appointment with Dr. ${doctorName} on ${date} at ${time} has been cancelled. Visit our website to reschedule. -DOCSlot`;
    return await sendSMS(phone, message);
};

/**
 * Send appointment reminder
 */
const sendAppointmentReminder = async (phone, patientName, doctorName, date, time) => {
    const message = `Reminder: Your appointment with Dr. ${doctorName} is tomorrow ${date} at ${time}. Don't forget! -DOCSlot`;
    return await sendSMS(phone, message);
};

export {
    sendSMS,
    sendAppointmentConfirmation,
    sendAppointmentCancellation,
    sendAppointmentReminder
};
```

### Integration in Controller
In `backend/controllers/userController.js`:

```javascript
import { sendAppointmentConfirmation } from '../services/smsService.js';

// In bookAppointment function (after saving appointment):
if (userData.phone) {
    const formattedDate = slotDate.split('_').join(' ');
    sendAppointmentConfirmation(
        userData.phone,
        userData.name,
        docData.name,
        formattedDate,
        slotTime
    ).catch(err => console.error('SMS error:', err));
}
```

---

## 📝 Step-by-Step: Fast2SMS (Easiest)

1. **Sign Up**: Go to https://www.fast2sms.com/
2. **Get API Key**: Dashboard → API → Copy your API key
3. **Add to .env**: `FAST2SMS_API_KEY=your_key_here`
4. **Copy service file** (code above)
5. **Integrate into controller** (code above)
6. **Test!**

---

## 🧪 Testing

### Test SMS Function
```javascript
// In your backend, create a test route
app.get('/test-sms', async (req, res) => {
    const result = await sendSMS('9876543210', 'Test message from DOCSlot!');
    res.json(result);
});
```

---

## 💡 Pro Tips

1. **India Users**: Use Fast2SMS or MSG91 (best pricing)
2. **Global Users**: Use Vonage or MessageBird
3. **High Volume**: Use MSG91 or Gupshup
4. **Simplicity**: Start with Fast2SMS (easiest to setup)
5. **WhatsApp + SMS**: Use MSG91, Vonage, or Gupshup

---

## ⚠️ Important: DLT Registration (For India)

If you're sending commercial SMS in India, you need DLT (Distributed Ledger Technology) registration:
1. Register your business on DLT portal
2. Register sender ID (e.g., "DOCSLOT")
3. Register message templates
4. Get DLT template IDs

Most providers (MSG91, Fast2SMS) provide DLT registration help.

---

## 🎉 Ready to Go!

Choose your provider and you're ready to send SMS notifications to your patients!

**Easiest path**: Start with **Fast2SMS** for SMS-only solution (takes 5 minutes)
**Best for India**: **MSG91** for both SMS + WhatsApp
**Global solution**: **Vonage** for international coverage
