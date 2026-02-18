# Dynamic Autonomous OPD Orchestration System

A comprehensive, event-driven intelligent queue management system for hospital Out-Patient Departments (OPDs).

## 🏗️ Architecture

This system implements a real-time, dynamic queue management solution with:

- **Dynamic ETA Calculation**: Real-time wait time estimation based on queue position, historical data, and current load
- **Geo-fencing**: Location-based check-in validation (200m radius)
- **Intelligent Leave Orchestrator**: Automatic patient redistribution when doctors go on leave
- **Real-time WebSocket Updates**: Live queue position and status updates
- **Role-Based Access Control**: Separate interfaces for patients, doctors, and admins

## 📚 Documentation

Comprehensive technical documentation is available in the root directory:

1. **[01-System-Architecture.md](./01-System-Architecture.md)** - System design, components, and data flow
2. **[02-Database-Schema.md](./02-Database-Schema.md)** - Complete database schema and relationships
3. **[03-API-Specification.md](./03-API-Specification.md)** - REST API endpoints and WebSocket events
4. **[04-Core-Algorithms.md](./04-Core-Algorithms.md)** - ETA calculation, geo-fencing, leave orchestration
5. **[05-User-Flows.md](./05-User-Flows.md)** - User journeys and interaction flows

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL 14+ with Sequelize ORM
- **Cache**: Redis 7+
- **Real-time**: Socket.io
- **Authentication**: JWT (jsonwebtoken)
- **Security**: Helmet, bcryptjs, CORS

### Frontend
- **Framework**: React 18 with Vite
- **Routing**: React Router 6
- **Styling**: Tailwind CSS 3
- **State Management**: Zustand with persist
- **API Client**: Axios with interceptors
- **Data Fetching**: TanStack React Query
- **Real-time**: Socket.io-client

## 📦 Project Structure

```
gpn/
├── backend/                  # Node.js Express Backend
│   ├── src/


## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- **Database**: Choose one option:
  - **Option A (Recommended)**: [Supabase](https://supabase.com) - Free PostgreSQL hosting (see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md))
  - **Option B**: Local PostgreSQL 14+ on localhost:5432
- **Cache** (Optional): Redis 7+ on localhost:6379

> 💡 **New to this?** Use Supabase - no local installation needed! Follow [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for step-by-step guide.

### 1. Backend Setup

```powershell
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file from example
cp .env.example .env

# Edit .env with your database connection
# For Supabase (recommended):
#   DATABASE_URL=postgresql://postgres.xxxxx:[PASSWORD]@...pooler.supabase.com:5432/postgres
# For local PostgreSQL:
#   DB_HOST=localhost
#   DB_PORT=5432
#   DB_NAME=opd_system
#   DB_USER=postgres
#   DB_PASSWORD=your_password

# Set JWT secret (generate random 32+ char string)
# JWT_SECRET=your_super_secret_key_here

# Start backend server (will auto-sync database on first run)
npm start
```

Backend will start on **http://localhost:5000**

### 2. Frontend Setup

```powershell
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will start on **http://localhost:5173**

### 3. Access the Application

- **Patient Portal**: http://localhost:5173/
- **Doctor Portal**: http://localhost:5173/ (use login toggle)
- **Admin Dashboard**: http://localhost:5173/admin

### Demo Credentials

**Doctor Login:**
- Employee Code: `DOC1024`
- Password: `password123`

**Patient Login:**
- Phone: Any phone number (auto-registration)
- Name: Your name

## 🗄️ Database Setup

The backend will automatically create tables on first run (Sequelize sync). For production, use migrations.

### Sample Data Seed

To populate the database with sample data, run these SQL commands:

```sql
-- Insert sample hospital
INSERT INTO hospitals (id, name, latitude, longitude, geofence_radius, operating_hours, created_at, updated_at)
VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  'City General Hospital',
  28.6139,
  77.2090,
  200,
  '{"monday": "09:00-17:00", "tuesday": "09:00-17:00", "wednesday": "09:00-17:00", "thursday": "09:00-17:00", "friday": "09:00-17:00", "saturday": "09:00-13:00"}',
  NOW(),
  NOW()
);

-- Insert sample department
INSERT INTO departments (id, hospital_id, name, avg_consultation_time, buffer_time, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '123e4567-e89b-12d3-a456-426614174000',
  'Cardiology',
  15,
  5,
  NOW(),
  NOW()
);

-- Insert sample doctor (password: password123)
INSERT INTO doctors (id, hospital_id, department_id, emp_code, name, password_hash, specialization, avg_consultation_time, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '123e4567-e89b-12d3-a456-426614174000',
  (SELECT id FROM departments WHERE name = 'Cardiology' LIMIT 1),
  'DOC1024',
  'Dr. Sarah Johnson',
  '$2a$10$X5Z0qH0xR7J5Z0qH0xR7J.X5Z0qH0xR7J5Z0qH0xR7J5Z0qH0xR7J',
  'Senior Cardiologist',
  15,
  'AVAILABLE',
  NOW(),
  NOW()
);
```

## 📡 API Endpoints

### Authentication
- `POST /api/v1/auth/patient/register` - Patient registration/login
- `POST /api/v1/auth/doctor/login` - Doctor login
- `POST /api/v1/auth/refresh` - Refresh JWT token

### Tokens
- `POST /api/v1/tokens/request` - Book new token
- `PATCH /api/v1/tokens/:tokenId/check-in` - Check-in (geo-validated)
- `GET /api/v1/tokens/:tokenId` - Get token details
- `DELETE /api/v1/tokens/:tokenId` - Cancel token

### Doctors
- `GET /api/v1/doctors/:doctorId/queue` - Get doctor's queue
- `POST /api/v1/doctors/consultations/start` - Start consultation
- `POST /api/v1/doctors/consultations/:id/complete` - Complete consultation
- `PATCH /api/v1/doctors/tokens/:tokenId/no-show` - Mark no-show
- `PATCH /api/v1/doctors/:doctorId/status` - Update doctor status

### Admin
- `GET /api/v1/admin/dashboard/overview` - Dashboard metrics
- `GET /api/v1/admin/heatmap` - Hourly load heatmap

## 🔌 WebSocket Events

### Subscribe Channels
- `token:{tokenId}` - Token-specific updates
- `doctor:{doctorId}` - Doctor queue updates
- `department:{deptId}` - Department-wide updates
- `admin:dashboard` - Admin metrics

### Broadcast Events
- `token:position_updated` - Queue position changed
- `token:tminus3` - 3 minutes before consultation
- `token:call_alert` - Doctor calling patient
- `doctor:queue_updated` - Queue refreshed
- `admin:metrics_updated` - Dashboard metrics updated

## 📱 Features

### Patient Features
- ✅ Quick registration with phone number
- ✅ Book appointments with department/doctor selection
- ✅ Real-time queue position tracking
- ✅ Geo-fenced check-in (must be within 200m)
- ✅ ETA updates every time queue moves
- ✅ Push notifications (T-3 min alert, call alert)
- ✅ View appointment history
- ✅ Cancel appointments

### Doctor Features
- ✅ View current queue with patient details
- ✅ Start/complete consultations
- ✅ Mark patients as no-show
- ✅ Update status (Available/On Leave/Break)
- ✅ View daily statistics
- ✅ Real-time queue updates

### Admin Features
- ✅ Real-time dashboard with key metrics
- ✅ Department-wise performance analytics
- ✅ Hourly load heatmap (color-coded)
- ✅ Bottleneck detection alerts
- ✅ Doctor utilization tracking
- ✅ Average wait time monitoring

## 🔒 Security

- JWT-based authentication with access/refresh tokens
- Password hashing with bcrypt (10 rounds)
- CORS protection with configurable origins
- Helmet.js for HTTP security headers
- Rate limiting (100 req/min per IP)
- Input validation on all endpoints
- SQL injection protection via Sequelize ORM

## 🧪 Testing

### API Testing with cURL

```powershell
# Register patient
curl -X POST http://localhost:5000/api/v1/auth/patient/register `
  -H "Content-Type: application/json" `
  -d '{\"phone\":\"+919876543210\",\"name\":\"John Doe\",\"hospitalId\":\"123e4567-e89b-12d3-a456-426614174000\"}'

# Login doctor
curl -X POST http://localhost:5000/api/v1/auth/doctor/login `
  -H "Content-Type: application/json" `
  -d '{\"empCode\":\"DOC1024\",\"password\":\"password123\",\"hospitalId\":\"123e4567-e89b-12d3-a456-426614174000\"}'
```

## 🐛 Troubleshooting

### Backend won't start
- Check PostgreSQL is running: `pg_isready`
- Check Redis is running: `redis-cli ping`
- Verify `.env` file exists with correct credentials

### Frontend can't connect to backend
- Check backend is running on port 5000
- Verify proxy configuration in `vite.config.js`
- Check CORS settings in backend `.env`

### WebSocket disconnections
- Check Redis connection
- Verify Socket.io CORS configuration
- Check firewall rules for WebSocket ports

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

---

**Built with ❤️ for better healthcare experiences**

## 📞 Contact & Support

For implementation guidance, architecture reviews, or partnership inquiries:

**Documentation Issues:** Open an issue in this repository
**Implementation Support:** Review the 5 core documents in sequence
**Customization:** Adapt schemas and algorithms to your requirements

---

**Built with ❤️ for better healthcare experiences**

> "The best queue is the one you don't have to wait in." - OPDSync Team

---

## 🗂️ Document Index

1. [System Architecture](./01_SYSTEM_ARCHITECTURE.md) - Foundation, tech stack, scalability
2. [Database Schema](./02_DATABASE_SCHEMA.md) - Data model, tables, relationships
3. [API Specification](./03_API_SPECIFICATION.md) - Endpoints, WebSocket, auth
4. [Core Algorithms](./04_CORE_ALGORITHMS.md) - Intelligence, ETA, redistribution
5. [User Flows](./05_USER_FLOWS.md) - Journey maps, edge cases, notifications

**Total Pages:** 100+ pages of production-ready technical documentation
