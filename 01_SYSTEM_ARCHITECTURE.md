# Dynamic Autonomous OPD Orchestration System
## System Architecture Blueprint

---

## 1. HIGH-LEVEL ARCHITECTURE

### 1.1 System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                       │
├─────────────┬──────────────┬──────────────┬─────────────────┤
│  Patient    │   Doctor     │   Admin      │   Display       │
│  Mobile App │   Dashboard  │   Control    │   Boards        │
│  (PWA)      │   (Web)      │   Center     │   (Kiosk)       │
└──────┬──────┴──────┬───────┴──────┬───────┴────────┬────────┘
       │             │              │                │
       └─────────────┴──────────────┴────────────────┘
                            │
                   ┌────────▼────────┐
                   │   API GATEWAY   │
                   │  (Rate Limiting) │
                   │  (Auth/JWT)     │
                   └────────┬────────┘
                            │
       ┌────────────────────┼────────────────────┐
       │                    │                    │
┌──────▼──────┐   ┌─────────▼────────┐   ┌──────▼──────┐
│ REST API    │   │ WebSocket Server │   │ Notification│
│ Service     │   │ (Socket.io)      │   │ Service     │
│ (Node.js/   │   │ Real-time sync   │   │ (WhatsApp/  │
│  Express)   │   │ <500ms latency   │   │  SMS/Push)  │
└──────┬──────┘   └─────────┬────────┘   └──────┬──────┘
       │                    │                    │
       └────────────────────┼────────────────────┘
                            │
                   ┌────────▼────────┐
                   │ ORCHESTRATION   │
                   │ ENGINE (Core)   │
                   │ ───────────────│
                   │ • ETA Calculator│
                   │ • Queue Manager │
                   │ • Auto-Scheduler│
                   │ • Event Handler │
                   └────────┬────────┘
                            │
       ┌────────────────────┼────────────────────┐
       │                    │                    │
┌──────▼──────┐   ┌─────────▼────────┐   ┌──────▼──────┐
│  PostgreSQL │   │  Redis Cache     │   │ Time-Series │
│  (Primary)  │   │  (Session/Queue) │   │ DB (Analytics)│
│  ACID       │   │  Pub/Sub         │   │ (InfluxDB)  │
└─────────────┘   └──────────────────┘   └─────────────┘
```

### 1.2 Technology Stack

**Frontend:**
- Patient App: React Native (iOS/Android) + PWA
- Doctor Dashboard: React.js + Material-UI
- Admin Panel: React.js + D3.js (Heatmaps)
- Display Boards: Electron.js (Kiosk Mode)

**Backend:**
- API Server: Node.js + Express.js (TypeScript)
- WebSocket: Socket.io
- Message Queue: Redis Pub/Sub + Bull Queue
- Background Jobs: Node-Cron

**Database:**
- Primary: PostgreSQL 14+ (JSONB support)
- Cache: Redis 6+ (Cluster Mode)
- Analytics: InfluxDB (Time-series metrics)

**Infrastructure:**
- Container: Docker + Docker Compose
- Orchestration: Kubernetes (Production)
- Load Balancer: Nginx
- Monitoring: Prometheus + Grafana

---

## 2. REAL-TIME SYNC ARCHITECTURE

### 2.1 WebSocket Communication Model

```javascript
// SOCKET.IO NAMESPACE STRUCTURE
/patient-queue     // Real-time queue updates
/doctor-console    // Token status, next patient alerts
/admin-dashboard   // System metrics, bottleneck alerts
/display-boards    // Token display for waiting areas

// EVENT FLOW
Patient Books Token → DB Insert → Redis Pub
  → Socket Broadcast → All Connected Clients Update (<500ms)
```

### 2.2 Event-Driven Architecture

**Critical Events:**
1. `TOKEN_CREATED` → Trigger ETA calculation → Notify patient
2. `DOCTOR_STATUS_CHANGED` → Recalculate all affected ETAs → Cascade updates
3. `CONSULTATION_COMPLETED` → Move next token → Alert patient (T-minus 3)
4. `DOCTOR_LEAVE_DECLARED` → Trigger redistribution algorithm
5. `PATIENT_NO_SHOW` → Skip token → Accelerate queue

**Redis Pub/Sub Channels:**
```
queue:update:dept:{deptId}
doctor:status:{doctorId}
token:alert:{tokenId}
system:bottleneck:{hospitalId}
```

---

## 3. DATA FLOW SEQUENCE

### 3.1 Token Booking Flow
```
Patient Initiates Booking
       ↓
[API] Validate: Patient Active + Doctor Available
       ↓
[DB] Create Token (Status: 'BOOKED')
       ↓
[Orchestrator] Calculate Initial ETA
       ↓
[Redis] Cache Token + Queue Position
       ↓
[WebSocket] Broadcast to Display Boards
       ↓
[Notification] Send Confirmation (WhatsApp/SMS)
       ↓
Return TokenID + ETA (± 5 min accuracy)
```

### 3.2 Check-In Flow (Geo-Fencing)
```
Patient Opens App Near Hospital
       ↓
[GPS] Get Latitude/Longitude
       ↓
[Algorithm] Haversine Distance Check
       ↓
IF distance < 200m:
    [API] PATCH /token/{id}/check-in
    [DB] Update Status: 'CHECKED_IN'
    [WebSocket] Update Live Queue Count
    [Notification] "You're checked in! Current wait: X mins"
ELSE:
    [UI] Show "Arrive at hospital to check in"
```

### 3.3 Consultation Flow
```
Doctor Clicks "Next Patient"
       ↓
[API] POST /consultation/start
[DB] Update Token Status: 'IN_CONSULTATION'
[Redis] Mark Timestamp
       ↓
[WebSocket] Remove from waiting queue display
       ↓
[Analytics] Record actual wait time vs. predicted
       ↓
Doctor Completes → Clicks "End"
       ↓
[DB] Update Status: 'COMPLETED'
[Analytics] Record consultation duration
       ↓
[Orchestrator] Trigger Next Token Alert
       ↓
[WebSocket] Update Queue (Next 3 patients alerted)
```

---

## 4. SCALABILITY & PERFORMANCE

### 4.1 Performance Targets
- API Response Time: <200ms (P95)
- WebSocket Latency: <500ms
- Concurrent Users: 10,000+ per hospital
- Database Query Time: <50ms (indexed queries)

### 4.2 Optimization Strategies

**Database:**
- Indexed columns: `token_id`, `doctor_id`, `status`, `created_at`
- Partitioning: Tokens table by date (monthly partitions)
- Read Replicas: 2+ for analytics queries

**Caching Strategy:**
```
Redis Cache Layers:
L1: Active Tokens (TTL: 24 hours)
L2: Doctor Schedules (TTL: 1 hour)
L3: Department Metadata (TTL: 1 day)

Cache Invalidation:
- On doctor status change → Invalidate L2
- On token completion → Remove from L1
- On department config update → Invalidate L3
```

**Load Balancing:**
- Round-robin across API servers
- Sticky sessions for WebSocket connections
- CDN for static assets (patient app)

---

## 5. SECURITY & COMPLIANCE

### 5.1 Authentication & Authorization
- JWT Tokens (Access: 15min, Refresh: 7 days)
- Role-Based Access Control (RBAC):
  - `PATIENT`: Own tokens only
  - `DOCTOR`: Assigned dept tokens
  - `ADMIN`: Full system access
  - `RECEPTIONIST`: Token creation/modification

### 5.2 Data Protection
- Encryption at Rest: AES-256
- Encryption in Transit: TLS 1.3
- PII Masking: Display only last 4 digits of phone
- HIPAA Compliance: Audit logs for all token access

### 5.3 Rate Limiting
```
Patient API: 100 req/min per IP
Doctor API: 500 req/min per user
Public Display: 10 req/min per device
WebSocket: 1000 messages/min per connection
```

---

## 6. DISASTER RECOVERY & FAILOVER

### 6.1 Fault Tolerance
- Database: Master-Slave replication (5-second lag tolerance)
- Redis: Cluster mode with automatic failover
- API Servers: Minimum 3 instances (N+2 redundancy)
- Backup: Automated daily backups (30-day retention)

### 6.2 Circuit Breaker Pattern
```javascript
// If external service (SMS/WhatsApp) fails:
Attempt 1 → Fail → Queue message
Wait 5s → Attempt 2 → Fail → Exponential backoff
Wait 25s → Attempt 3 → Fail → Log & Alert Admin
Continue core operations without blocking
```

---

## 7. MONITORING & OBSERVABILITY

### 7.1 Key Metrics (Prometheus)
```
opd_tokens_created_total (Counter)
opd_queue_length_current (Gauge by department)
opd_consultation_duration_seconds (Histogram)
opd_wait_time_actual_vs_predicted (Summary)
opd_no_show_rate (Counter)
opd_api_latency_ms (Histogram)
```

### 7.2 Alerting Rules
```
CRITICAL: Queue length > 50 for 15 minutes
WARNING: Average wait time > 2x predicted
INFO: Doctor idle for 10+ minutes with pending tokens
CRITICAL: API error rate > 5% for 5 minutes
```

### 7.3 Grafana Dashboards
1. **Operations Dashboard**: Real-time queue, active doctors, bottlenecks
2. **Performance Dashboard**: API latency, DB query time, cache hit rate
3. **Business Dashboard**: Daily token volume, no-show rates, peak hours
