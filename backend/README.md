# Backend - OPD Orchestration System

Node.js Express backend with PostgreSQL, Redis, and Socket.io for real-time queue management.

## 🚀 Quick Start

**For Supabase (Recommended - No local setup)**: See [../SUPABASE_SETUP.md](../SUPABASE_SETUP.md)

**For Local PostgreSQL**:

```powershell
# Install dependencies
npm install

# Configure environment
cp .env.supabase .env  # For Supabase
# OR
cp .env.example .env   # For local PostgreSQL

# Edit .env with your credentials

# Start development server
npm run dev

# Start production server
npm start
```

## 📋 Prerequisites

**Option A (Recommended): Supabase**
- Node.js 18.x or higher
- Supabase account (free tier available)
- See [../SUPABASE_SETUP.md](../SUPABASE_SETUP.md) for setup

**Option B: Local Setup**
- Node.js 18.x or higher
- PostgreSQL 14.x or higher
- Redis 7.x or higher (optional - will use mock if not available)
- npm or yarn package manager

## 🔧 Environment Variables

Create a `.env` file in the backend root directory:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database Configuration
DB_NAME=opd_system
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_HOST=localhost
DB_PORT=5432
DB_DIALECT=postgres

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_REFRESH_SECRET=your_super_secret_refresh_key_change_this_in_production
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100

# Geofencing
DEFAULT_GEOFENCE_RADIUS=200

# Logging
LOG_LEVEL=info
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js       # Sequelize PostgreSQL configuration
│   │   └── redis.js          # Redis client setup
│   │
│   ├── models/
│   │   ├── index.js          # Model associations
│   │   ├── Hospital.js       # Hospital model
│   │   ├── Department.js     # Department model
│   │   ├── Doctor.js         # Doctor model with auth
│   │   ├── Patient.js        # Patient model
│   │   └── Token.js          # Token/Queue model
│   │
│   ├── services/
│   │   ├── etaCalculator.js      # Dynamic ETA calculation
│   │   ├── geoFencing.js         # Location validation
│   │   └── leaveOrchestrator.js  # Leave handling & redistribution
│   │
│   ├── middleware/
│   │   └── auth.js           # JWT authentication & RBAC
│   │
│   ├── routes/
│   │   ├── auth.js           # Authentication endpoints
│   │   ├── tokens.js         # Token management
│   │   ├── doctors.js        # Doctor operations
│   │   └── admin.js          # Admin analytics
│   │
│   ├── websocket.js          # Socket.io configuration
│   └── server.js             # Express app entry point
│
├── package.json
├── .env.example
└── README.md
```

## 💾 Database Setup

### Create Database

```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create database
CREATE DATABASE opd_system;

-- Connect to database
\c opd_system

-- Verify connection
SELECT current_database();
```

### Auto-Sync (Development)

The application will automatically create tables on first run when `NODE_ENV=development`.

### Manual Migration (Production)

For production, use Sequelize CLI migrations:

```powershell
# Install Sequelize CLI globally
npm install -g sequelize-cli

# Initialize Sequelize
npx sequelize-cli init

# Create migration
npx sequelize-cli migration:generate --name create-initial-schema

# Run migrations
npx sequelize-cli db:migrate

# Rollback migration
npx sequelize-cli db:migrate:undo
```

## 🌱 Seed Data

Create sample data for testing:

```powershell
# Create seed file
npx sequelize-cli seed:generate --name demo-data

# Run seeds
npx sequelize-cli db:seed:all
```

Or use SQL directly:

```sql
-- Sample Hospital
INSERT INTO hospitals (id, name, latitude, longitude, geofence_radius, operating_hours, created_at, updated_at)
VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  'City General Hospital',
  28.6139,
  77.2090,
  200,
  '{"monday":"09:00-17:00","tuesday":"09:00-17:00","wednesday":"09:00-17:00","thursday":"09:00-17:00","friday":"09:00-17:00","saturday":"09:00-13:00"}',
  NOW(),
  NOW()
);

-- Sample Department
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
);

-- Sample Doctor (password: password123)
INSERT INTO doctors (id, hospital_id, department_id, emp_code, name, password_hash, specialization, avg_consultation_time, max_tokens_per_session, status, created_at, updated_at)
VALUES (
  'd1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a',
  '123e4567-e89b-12d3-a456-426614174000',
  'c47c7e3f-8a5b-4c3d-9f2e-1a2b3c4d5e6f',
  'DOC1024',
  'Dr. Sarah Johnson',
  '$2a$10$bQ8uZ4f8L5yVCX0sJZ8P1.FkPqVZH8wY5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5.',
  'Senior Cardiologist',
  15,
  30,
  'AVAILABLE',
  NOW(),
  NOW()
);
```

## 🔌 API Endpoints

### Authentication

**POST** `/api/v1/auth/patient/register`
```json
{
  "phone": "+919876543210",
  "name": "John Doe",
  "hospitalId": "123e4567-e89b-12d3-a456-426614174000"
}
```

**POST** `/api/v1/auth/doctor/login`
```json
{
  "empCode": "DOC1024",
  "password": "password123",
  "hospitalId": "123e4567-e89b-12d3-a456-426614174000"
}
```

**POST** `/api/v1/auth/refresh`
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Tokens

**POST** `/api/v1/tokens/request`
```json
{
  "departmentId": "c47c7e3f-8a5b-4c3d-9f2e-1a2b3c4d5e6f",
  "doctorId": "d1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a",
  "visitReason": "Chest pain and breathing difficulty",
  "scheduledTime": "2024-01-15T10:30:00.000Z"
}
```

**PATCH** `/api/v1/tokens/:tokenId/check-in`
```json
{
  "latitude": 28.6140,
  "longitude": 77.2091
}
```

**GET** `/api/v1/tokens/:tokenId`

**DELETE** `/api/v1/tokens/:tokenId`

### Doctors

**GET** `/api/v1/doctors/:doctorId/queue`

**POST** `/api/v1/doctors/consultations/start`
```json
{
  "tokenId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
}
```

**POST** `/api/v1/doctors/consultations/:consultationId/complete`

**PATCH** `/api/v1/doctors/tokens/:tokenId/no-show`

**PATCH** `/api/v1/doctors/:doctorId/status`
```json
{
  "status": "ON_LEAVE"
}
```

### Admin

**GET** `/api/v1/admin/dashboard/overview`

**GET** `/api/v1/admin/heatmap?date=2024-01-15`

## 🔌 WebSocket Events

### Client → Server

```javascript
// Subscribe to token updates
socket.emit('subscribe', { channel: 'token', id: 'token-id' });

// Subscribe to doctor queue
socket.emit('subscribe', { channel: 'doctor', id: 'doctor-id' });

// Unsubscribe
socket.emit('unsubscribe', { channel: 'token', id: 'token-id' });
```

### Server → Client

```javascript
// Token position updated
socket.on('token:position_updated', (data) => {
  // data: { tokenId, queuePosition, estimatedWaitTime }
});

// T-minus 3 alert
socket.on('token:tminus3', (data) => {
  // data: { tokenId, message }
});

// Call alert
socket.on('token:call_alert', (data) => {
  // data: { tokenId, message, roomNumber }
});

// Doctor queue updated
socket.on('doctor:queue_updated', (data) => {
  // data: { doctorId, queue, stats }
});
```

## 🧪 Testing

### Run Tests

```powershell
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Manual API Testing

Use the provided REST client file or cURL:

```powershell
# Test patient registration
curl -X POST http://localhost:5000/api/v1/auth/patient/register `
  -H "Content-Type: application/json" `
  -d '{\"phone\":\"+919876543210\",\"name\":\"Test User\",\"hospitalId\":\"123e4567-e89b-12d3-a456-426614174000\"}'

# Test with authorization
curl -X GET http://localhost:5000/api/v1/tokens/abc123 `
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📊 Monitoring

### Application Logs

```powershell
# View logs (if using PM2)
pm2 logs opd-backend

# Real-time logs
tail -f logs/app.log
```

### Database Monitoring

```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check table sizes
SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- Monitor slow queries
SELECT query, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Redis Monitoring

```bash
redis-cli INFO
redis-cli MONITOR
redis-cli --latency
```

## 🚀 Deployment

### PM2 (Process Manager)

```powershell
# Install PM2
npm install -g pm2

# Start application
pm2 start src/server.js --name opd-backend

# View status
pm2 status

# View logs
pm2 logs opd-backend

# Restart
pm2 restart opd-backend

# Stop
pm2 stop opd-backend

# Startup script
pm2 startup
pm2 save
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

```powershell
# Build image
docker build -t opd-backend .

# Run container
docker run -d -p 5000:5000 --env-file .env opd-backend
```

## 🔒 Security Best Practices

1. **Environment Variables**: Never commit `.env` to version control
2. **JWT Secrets**: Use strong, random secrets (min 32 characters)
3. **Password Hashing**: bcrypt with 10 rounds (already configured)
4. **Rate Limiting**: Adjust limits based on traffic patterns
5. **CORS**: Restrict origins to known frontend domains
6. **SQL Injection**: Use Sequelize parameterized queries (done)
7. **XSS Protection**: Helmet middleware enabled
8. **HTTPS**: Use in production with reverse proxy (nginx)

## 🐛 Common Issues

### Database Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution**: Check PostgreSQL is running and `.env` credentials are correct.

### Redis Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```
**Solution**: Start Redis server: `redis-server`

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution**: Change PORT in `.env` or kill process on port 5000.

### JWT Secret Not Set
```
Error: JWT_SECRET must be defined
```
**Solution**: Set `JWT_SECRET` and `JWT_REFRESH_SECRET` in `.env`.

## 📚 Dependencies

### Core
- `express` - Web framework
- `sequelize` - ORM for PostgreSQL
- `pg` & `pg-hstore` - PostgreSQL driver
- `redis` - Redis client
- `socket.io` - WebSocket server

### Authentication & Security
- `jsonwebtoken` - JWT handling
- `bcryptjs` - Password hashing
- `helmet` - Security headers
- `cors` - CORS middleware
- `express-rate-limit` - Rate limiting

### Utilities
- `dotenv` - Environment variables
- `morgan` - HTTP logging
- `compression` - Response compression
- `node-cron` - Scheduled tasks

## 🤝 Contributing

1. Follow existing code structure
2. Add tests for new features
3. Update API documentation
4. Use ESLint configuration
5. Write meaningful commit messages

## 📄 License

MIT License - See LICENSE file for details
