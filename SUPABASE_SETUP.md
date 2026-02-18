# Supabase Integration Guide

This guide will walk you through setting up Supabase as the database backend for the OPD Orchestration System.

## 🚀 Why Supabase?

- **Free PostgreSQL hosting** (500MB database, 50,000 monthly active users)
- **No local setup required** - works immediately
- **Built-in database UI** for easy data management
- **Automatic backups** and SSL connections
- **API & Real-time subscriptions** (bonus features)

---

## 📝 Step 1: Create Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"**
3. Sign up with GitHub (recommended) or email
4. Verify your email if required

---

## 🏗️ Step 2: Create New Project

1. Click **"New Project"**
2. Fill in the details:
   - **Name**: `opd-orchestration` (or any name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your location
   - **Pricing Plan**: Free tier is sufficient
3. Click **"Create new project"**
4. Wait 2-3 minutes for provisioning

---

## 🔗 Step 3: Get Connection String

### Method 1: Connection Pooler (Recommended)

1. In your Supabase dashboard, click **"Project Settings"** (gear icon)
2. Go to **"Database"** section
3. Scroll to **"Connection string"**
4. Select **"Connection pooling"** tab
5. Mode: **"Transaction"**
6. Copy the connection string (looks like):
   ```
   postgresql://postgres.xxxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
   ```
7. Replace `[YOUR-PASSWORD]` with your actual database password

### Method 2: Direct Connection (Alternative)

Use the **"Connection string"** tab instead of pooling:
```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
```

---

## ⚙️ Step 4: Configure Backend

### Create .env file

1. Navigate to backend directory:
   ```powershell
   cd backend
   ```

2. Copy example env file:
   ```powershell
   cp .env.example .env
   ```

3. Edit `.env` file and update the `DATABASE_URL`:
   ```env
   # Paste your Supabase connection string here
   DATABASE_URL=postgresql://postgres.xxxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres

   # Update other settings
   NODE_ENV=development
   PORT=5000

   JWT_SECRET=your_super_secret_key_min_32_chars_long
   JWT_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d

   CORS_ORIGIN=http://localhost:5174

   # Redis (optional - can skip for now)
   # REDIS_HOST=localhost
   # REDIS_PORT=6379
   ```

4. **Important**: Generate a secure JWT secret:
   ```powershell
   # Option 1: Using Node.js
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

   # Option 2: Use any random string generator
   # https://randomkeygen.com/
   ```

---

## 🗄️ Step 5: Initialize Database

### Start Backend (First Time)

The backend will automatically create all tables on first run:

```powershell
cd backend
npm install
npm start
```

You should see:
```
✓ Database tables synced successfully
🚀 Server running on http://localhost:5000
```

### Verify Tables in Supabase

1. Go to Supabase dashboard
2. Click **"Table Editor"** in left sidebar
3. You should see these tables:
   - `hospitals`
   - `departments`
   - `doctors`
   - `patients`
   - `tokens`

---

## 📊 Step 6: Seed Sample Data

### Using Supabase SQL Editor

1. In Supabase dashboard, click **"SQL Editor"**
2. Click **"New query"**
3. Paste and run this SQL:

```sql
-- Insert sample hospital
INSERT INTO hospitals (id, name, latitude, longitude, geofence_radius, operating_hours, created_at, updated_at)
VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  'City General Hospital',
  28.6139,
  77.2090,
  200,
  '{"monday":"09:00-17:00","tuesday":"09:00-17:00","wednesday":"09:00-17:00","thursday":"09:00-17:00","friday":"09:00-17:00","saturday":"09:00-13:00"}'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert sample department
INSERT INTO departments (id, hospital_id, name, avg_consultation_time, buffer_time, color_code, created_at, updated_at)
VALUES (
  'c47c7e3f-8a5b-4c3d-9f2e-1a2b3c4d5e6f',
  '123e4567-e89b-12d3-a456-426614174000',
  'Cardiology',
  15,
  5,
  '#3B82F6',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert sample doctor (password: password123)
-- Note: You need to hash this password properly in production
INSERT INTO doctors (id, hospital_id, department_id, emp_code, name, password_hash, specialization, avg_consultation_time, max_tokens_per_session, status, created_at, updated_at)
VALUES (
  'd1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a',
  '123e4567-e89b-12d3-a456-426614174000',
  'c47c7e3f-8a5b-4c3d-9f2e-1a2b3c4d5e6f',
  'DOC1024',
  'Dr. Sarah Johnson',
  '$2a$10$rBV2kHSlYqPXqeNOFxYN4eTxU/5w0F/Jf7ys6OqQf7J5Z0qH0xR7Ju',
  'Senior Cardiologist',
  15,
  30,
  'AVAILABLE',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Verify data
SELECT 'Hospitals' as table_name, COUNT(*) as count FROM hospitals
UNION ALL
SELECT 'Departments', COUNT(*) FROM departments
UNION ALL
SELECT 'Doctors', COUNT(*) FROM doctors;
```

4. Click **"Run"**
5. You should see success message and counts

---

## 🎯 Step 7: Test the Application

### Start Backend
```powershell
cd backend
npm start
```

Should show:
```
✓ Database connected successfully
✓ Database tables synced successfully
🚀 Server running on http://localhost:5000
```

### Start Frontend
```powershell
cd frontend
npm run dev
```

Should show:
```
➜  Local:   http://localhost:5174/
```

### Login and Test

1. Open http://localhost:5174
2. **Doctor Login**:
   - Employee Code: `DOC1024`
   - Password: `password123`
3. **Patient Login**:
   - Phone: Any number (e.g., `+919876543210`)
   - Name: Your name

---

## 🔧 Advanced Configuration

### Redis Alternative (If Skipping Redis)

If you don't want to set up Redis, comment out Redis-related code:

**backend/src/config/redis.js** - Add this at the top:
```javascript
// Disable Redis for now
export default {
  get: async () => null,
  set: async () => true,
  del: async () => true,
  quit: async () => true
};

// Comment out the real Redis client below
```

### Environment Variables Reference

```env
# Required
DATABASE_URL=your_supabase_connection_string
JWT_SECRET=your_secret_key_min_32_chars
PORT=5000

# Optional
CORS_ORIGIN=http://localhost:5174
NODE_ENV=development
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
DEFAULT_GEOFENCE_RADIUS=200
```

---

## 🎨 Supabase Dashboard Features

### View Live Data
- **Table Editor**: Browse and edit data visually
- **SQL Editor**: Run custom queries
- **API Docs**: Auto-generated REST API docs

### Monitor Performance
- **Database**: Connection stats, query performance
- **Logs**: Real-time database logs
- **Reports**: Usage analytics

### Security (Production)
1. Go to **Project Settings** → **API**
2. Copy your **anon** key (for frontend calls)
3. Enable **Row Level Security (RLS)** for tables
4. Set up authentication rules

---

## 🐛 Troubleshooting

### Connection Refused Error
```
ECONNREFUSED
```
**Solution**: Check your DATABASE_URL is correct and password is properly URL-encoded

### SSL Error
```
certificate verify failed
```
**Solution**: Already handled in database.js with SSL config

### Too Many Connections
```
remaining connection slots reserved
```
**Solution**: Using connection pooler (already configured)

### Password Contains Special Characters
If your password has `@`, `#`, `%`, etc., you need to URL-encode it:
- `@` → `%40`
- `#` → `%23`
- `%` → `%25`

Or regenerate a simpler password in Supabase settings.

---

## 📦 Supabase Free Tier Limits

| Resource | Limit |
|----------|-------|
| Database Size | 500 MB |
| Monthly Active Users | 50,000 |
| API Requests | Unlimited |
| Realtime Connections | Unlimited |
| Storage | 1 GB |
| Bandwidth | 2 GB |

**More than enough for development and small deployments!**

---

## 🚀 Production Checklist

Before going live:

- [ ] Upgrade to Pro plan ($25/month) for better performance
- [ ] Enable Point-in-Time Recovery (PITR)
- [ ] Set up Row Level Security (RLS) policies
- [ ] Create database backups
- [ ] Use environment-specific connection strings
- [ ] Enable logging and monitoring
- [ ] Set up custom domain (optional)

---

## 📞 Support

- **Supabase Docs**: https://supabase.com/docs
- **Supabase Discord**: https://discord.supabase.com
- **OPD Project Issues**: GitHub repository

---

## ✅ Quick Setup Summary

```powershell
# 1. Create Supabase project at supabase.com
# 2. Copy connection string from Project Settings → Database
# 3. Configure backend
cd backend
cp .env.example .env
# Edit .env with DATABASE_URL

# 4. Install and start
npm install
npm start

# 5. Frontend in new terminal
cd ../frontend
npm install
npm run dev

# 6. Open http://localhost:5174
# 7. Login with DOC1024 / password123
```

**You're all set! 🎉**
