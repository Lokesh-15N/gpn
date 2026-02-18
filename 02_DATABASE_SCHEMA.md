# Database Schema Design
## Normalized SQL Schema for OPD Orchestration System

---

## ENTITY RELATIONSHIP DIAGRAM (ERD)

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│  HOSPITALS   │────┬───>│ DEPARTMENTS  │────┬───>│   DOCTORS    │
└──────────────┘    │    └──────────────┘    │    └──────────────┘
                    │                        │            │
                    │                        │            │
                    │    ┌──────────────┐    │            │
                    └───>│   CABINS     │<───┘            │
                         └──────────────┘                 │
                                │                         │
                                │                         │
                         ┌──────▼──────┐          ┌──────▼──────┐
                         │CABIN_DOCTORS│<─────────┤   TOKENS    │
                         │(Assignment) │          │(Live Queue) │
                         └─────────────┘          └──────┬──────┘
                                                          │
                         ┌────────────────────────────────┤
                         │                                │
                  ┌──────▼──────┐              ┌─────────▼────────┐
                  │  PATIENTS   │              │ TOKEN_HISTORY    │
                  └─────────────┘              │(State Changes)   │
                                               └──────────────────┘
```

---

## TABLE DEFINITIONS

### 1. HOSPITALS

```sql
CREATE TABLE hospitals (
    hospital_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,        -- For geo-fencing
    longitude DECIMAL(11, 8) NOT NULL,
    geofence_radius INT DEFAULT 200,          -- Meters
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    operating_hours JSONB DEFAULT '{         -- Flexible schedule
        "monday": {"open": "08:00", "close": "20:00"},
        "tuesday": {"open": "08:00", "close": "20:00"}
    }',
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_hospitals_location ON hospitals USING GIST (
    ll_to_earth(latitude, longitude)
);
```

---

### 2. DEPARTMENTS

```sql
CREATE TABLE departments (
    dept_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(hospital_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,              -- "Cardiology", "Orthopedics"
    code VARCHAR(10) NOT NULL UNIQUE,        -- "CARD", "ORTHO"
    avg_consultation_time INT NOT NULL,      -- In minutes (e.g., 15)
    buffer_time INT DEFAULT 5,               -- Sanitization gap
    max_tokens_per_day INT DEFAULT 100,
    color_code VARCHAR(7) DEFAULT '#007BFF', -- For UI display
    priority_level INT DEFAULT 1,            -- For emergency routing
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(hospital_id, code)
);

CREATE INDEX idx_dept_hospital ON departments(hospital_id);
CREATE INDEX idx_dept_status ON departments(status) WHERE status = 'ACTIVE';
```

---

### 3. CABINS (Consultation Rooms)

```sql
CREATE TABLE cabins (
    cabin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dept_id UUID NOT NULL REFERENCES departments(dept_id) ON DELETE CASCADE,
    cabin_number VARCHAR(20) NOT NULL,       -- "C-101", "Room A"
    floor_number INT,
    capacity INT DEFAULT 1,                   -- Doctors per cabin
    equipment JSONB DEFAULT '[]',             -- ["ECG", "X-Ray Viewer"]
    status VARCHAR(20) DEFAULT 'AVAILABLE',   -- AVAILABLE, OCCUPIED, MAINTENANCE
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(dept_id, cabin_number)
);

CREATE INDEX idx_cabin_dept ON cabins(dept_id);
CREATE INDEX idx_cabin_status ON cabins(status);
```

---

### 4. DOCTORS

```sql
CREATE TABLE doctors (
    doctor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(hospital_id),
    emp_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    primary_dept_id UUID REFERENCES departments(dept_id),
    phone VARCHAR(15) NOT NULL,
    email VARCHAR(255) UNIQUE,
    avg_consultation_time INT DEFAULT 15,    -- Doctor-specific override
    max_tokens_per_session INT DEFAULT 30,
    profile_image_url TEXT,
    status VARCHAR(20) DEFAULT 'ACTIVE',     -- ACTIVE, ON_LEAVE, INACTIVE
    last_active_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_doctor_hospital ON doctors(hospital_id);
CREATE INDEX idx_doctor_dept ON doctors(primary_dept_id);
CREATE INDEX idx_doctor_status ON doctors(status);
CREATE INDEX idx_doctor_email ON doctors(email);
```

---

### 5. CABIN_DOCTORS (Many-to-Many Assignment)

```sql
CREATE TABLE cabin_doctors (
    assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cabin_id UUID NOT NULL REFERENCES cabins(cabin_id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    shift_date DATE NOT NULL,
    shift_start_time TIME NOT NULL,
    shift_end_time TIME NOT NULL,
    actual_start_time TIMESTAMP,             -- For late arrivals
    actual_end_time TIMESTAMP,
    planned_tokens INT DEFAULT 30,
    status VARCHAR(20) DEFAULT 'SCHEDULED',  -- SCHEDULED, ACTIVE, COMPLETED, CANCELLED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(cabin_id, doctor_id, shift_date, shift_start_time)
);

CREATE INDEX idx_assignment_cabin ON cabin_doctors(cabin_id);
CREATE INDEX idx_assignment_doctor ON cabin_doctors(doctor_id);
CREATE INDEX idx_assignment_date ON cabin_doctors(shift_date);
CREATE INDEX idx_assignment_status ON cabin_doctors(status);
```

---

### 6. PATIENTS

```sql
CREATE TABLE patients (
    patient_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(hospital_id),
    uhid VARCHAR(50) NOT NULL UNIQUE,        -- Hospital Patient ID
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    email VARCHAR(255),
    date_of_birth DATE,
    gender VARCHAR(10),
    address TEXT,
    emergency_contact VARCHAR(15),
    fcm_token TEXT,                           -- For push notifications
    whatsapp_opt_in BOOLEAN DEFAULT TRUE,
    sms_opt_in BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(hospital_id, uhid)
);

CREATE INDEX idx_patient_phone ON patients(phone);
CREATE INDEX idx_patient_uhid ON patients(uhid);
```

---

### 7. TOKENS (Live Queue)

```sql
CREATE TABLE tokens (
    token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_number VARCHAR(20) NOT NULL,       -- "C-045", "ORTHO-023"
    patient_id UUID NOT NULL REFERENCES patients(patient_id),
    doctor_id UUID NOT NULL REFERENCES doctors(doctor_id),
    cabin_id UUID NOT NULL REFERENCES cabins(cabin_id),
    dept_id UUID NOT NULL REFERENCES departments(dept_id),
    hospital_id UUID NOT NULL REFERENCES hospitals(hospital_id),

    -- Booking Details
    booking_type VARCHAR(20) DEFAULT 'WALK_IN', -- WALK_IN, ONLINE, EMERGENCY
    priority INT DEFAULT 1,                    -- 1=Normal, 2=Senior, 3=Emergency

    -- Status Tracking
    status VARCHAR(20) NOT NULL DEFAULT 'BOOKED',
    /* Status Flow:
       BOOKED → CHECKED_IN → WAITING → IN_CONSULTATION → COMPLETED
                                     ↓
                                  NO_SHOW / CANCELLED / RESCHEDULED
    */

    -- Timing Data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scheduled_time TIMESTAMP NOT NULL,       -- Original appointment time
    check_in_time TIMESTAMP,
    check_in_latitude DECIMAL(10, 8),        -- Geo-fencing validation
    check_in_longitude DECIMAL(11, 8),
    called_time TIMESTAMP,                    -- When doctor called token
    consultation_start_time TIMESTAMP,
    consultation_end_time TIMESTAMP,

    -- Queue Management
    queue_position INT,                       -- Current position in line
    estimated_wait_time INT,                  -- In minutes
    eta_updated_at TIMESTAMP,

    -- Metadata
    visit_reason TEXT,
    notes JSONB DEFAULT '{}',
    cancellation_reason TEXT,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_status CHECK (status IN (
        'BOOKED', 'CHECKED_IN', 'WAITING', 'IN_CONSULTATION',
        'COMPLETED', 'NO_SHOW', 'CANCELLED', 'RESCHEDULED'
    ))
);

-- Critical Indexes for Performance
CREATE INDEX idx_token_patient ON tokens(patient_id);
CREATE INDEX idx_token_doctor ON tokens(doctor_id);
CREATE INDEX idx_token_cabin ON tokens(cabin_id);
CREATE INDEX idx_token_dept ON tokens(dept_id);
CREATE INDEX idx_token_hospital ON tokens(hospital_id);
CREATE INDEX idx_token_status ON tokens(status) WHERE status IN ('WAITING', 'IN_CONSULTATION');
CREATE INDEX idx_token_scheduled ON tokens(scheduled_time);
CREATE INDEX idx_token_created ON tokens(created_at);

-- Composite Index for Live Queue Queries
CREATE INDEX idx_token_live_queue ON tokens(
    doctor_id, status, queue_position
) WHERE status IN ('CHECKED_IN', 'WAITING');

-- Partition by Month (for scalability)
CREATE TABLE tokens_2026_02 PARTITION OF tokens
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

---

### 8. TOKEN_HISTORY (State Change Audit)

```sql
CREATE TABLE token_history (
    history_id BIGSERIAL PRIMARY KEY,
    token_id UUID NOT NULL REFERENCES tokens(token_id) ON DELETE CASCADE,
    previous_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    changed_by UUID,                          -- User who triggered change
    change_reason VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_history_token ON token_history(token_id);
CREATE INDEX idx_history_timestamp ON token_history(changed_at);
```

---

### 9. SCHEDULE_EXCEPTIONS (Leave Management)

```sql
CREATE TABLE schedule_exceptions (
    exception_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    exception_type VARCHAR(20) NOT NULL,     -- PLANNED_LEAVE, UNPLANNED_LEAVE, EMERGENCY
    start_datetime TIMESTAMP NOT NULL,
    end_datetime TIMESTAMP NOT NULL,
    reason TEXT,
    affected_tokens_count INT DEFAULT 0,
    redistribution_status VARCHAR(20) DEFAULT 'PENDING',
    /* PENDING → REDISTRIBUTED / RESCHEDULED / CANCELLED */

    approver_id UUID REFERENCES doctors(doctor_id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_exception_type CHECK (exception_type IN (
        'PLANNED_LEAVE', 'UNPLANNED_LEAVE', 'EMERGENCY', 'TRAINING', 'SURGERY'
    ))
);

CREATE INDEX idx_exception_doctor ON schedule_exceptions(doctor_id);
CREATE INDEX idx_exception_dates ON schedule_exceptions(start_datetime, end_datetime);
```

---

### 10. DOCTOR_PERFORMANCE_METRICS (Analytics)

```sql
CREATE TABLE doctor_performance_metrics (
    metric_id BIGSERIAL PRIMARY KEY,
    doctor_id UUID NOT NULL REFERENCES doctors(doctor_id),
    metric_date DATE NOT NULL,

    -- Daily Stats
    tokens_scheduled INT DEFAULT 0,
    tokens_completed INT DEFAULT 0,
    tokens_no_show INT DEFAULT 0,

    -- Timing Metrics
    avg_consultation_time_mins NUMERIC(5,2),
    avg_wait_time_mins NUMERIC(5,2),
    first_patient_delay_mins INT,            -- Late start
    last_patient_time TIME,                  -- Overtime tracking

    -- Efficiency
    idle_time_mins INT DEFAULT 0,
    break_time_mins INT DEFAULT 0,
    utilization_rate NUMERIC(5,2),           -- % of time consulting

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(doctor_id, metric_date)
);

CREATE INDEX idx_metrics_doctor ON doctor_performance_metrics(doctor_id);
CREATE INDEX idx_metrics_date ON doctor_performance_metrics(metric_date);
```

---

### 11. SYSTEM_ALERTS (Bottleneck Detection)

```sql
CREATE TABLE system_alerts (
    alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(50) NOT NULL,         -- BOTTLENECK, DOCTOR_IDLE, LONG_WAIT
    severity VARCHAR(20) DEFAULT 'INFO',     -- INFO, WARNING, CRITICAL
    entity_type VARCHAR(50),                  -- DEPARTMENT, DOCTOR, CABIN
    entity_id UUID,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alerts_unresolved ON system_alerts(created_at)
    WHERE is_resolved = FALSE;
CREATE INDEX idx_alerts_severity ON system_alerts(severity);
```

---

### 12. NOTIFICATIONS_LOG

```sql
CREATE TABLE notifications_log (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(patient_id),
    token_id UUID REFERENCES tokens(token_id),
    channel VARCHAR(20) NOT NULL,            -- SMS, WHATSAPP, PUSH, EMAIL
    event_type VARCHAR(50) NOT NULL,         -- TOKEN_CREATED, T_MINUS_3, CALL_NOW
    message TEXT NOT NULL,
    phone_number VARCHAR(15),
    delivery_status VARCHAR(20) DEFAULT 'PENDING',
    /* PENDING → SENT → DELIVERED / FAILED */
    external_id VARCHAR(255),                 -- Provider's message ID
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    failed_reason TEXT,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notif_patient ON notifications_log(patient_id);
CREATE INDEX idx_notif_token ON notifications_log(token_id);
CREATE INDEX idx_notif_status ON notifications_log(delivery_status)
    WHERE delivery_status = 'PENDING';
```

---

## DATABASE VIEWS (For Quick Queries)

### View 1: Live Queue Dashboard

```sql
CREATE VIEW vw_live_queue AS
SELECT
    t.token_id,
    t.token_number,
    p.name AS patient_name,
    p.phone AS patient_phone,
    d.name AS doctor_name,
    dept.name AS department_name,
    c.cabin_number,
    t.status,
    t.queue_position,
    t.estimated_wait_time,
    t.scheduled_time,
    t.check_in_time,
    EXTRACT(EPOCH FROM (NOW() - t.check_in_time))/60 AS actual_wait_mins
FROM tokens t
JOIN patients p ON t.patient_id = p.patient_id
JOIN doctors d ON t.doctor_id = d.doctor_id
JOIN departments dept ON t.dept_id = dept.dept_id
JOIN cabins c ON t.cabin_id = c.cabin_id
WHERE t.status IN ('CHECKED_IN', 'WAITING', 'IN_CONSULTATION')
AND DATE(t.scheduled_time) = CURRENT_DATE
ORDER BY t.queue_position;
```

### View 2: Doctor Real-Time Status

```sql
CREATE VIEW vw_doctor_status AS
SELECT
    d.doctor_id,
    d.name AS doctor_name,
    d.specialization,
    cd.cabin_id,
    c.cabin_number,
    COUNT(t.token_id) FILTER (WHERE t.status = 'WAITING') AS pending_tokens,
    MAX(t.consultation_start_time) AS last_consult_start,
    CASE
        WHEN EXISTS (SELECT 1 FROM tokens WHERE doctor_id = d.doctor_id
                     AND status = 'IN_CONSULTATION')
        THEN 'BUSY'
        WHEN cd.status = 'ACTIVE' THEN 'AVAILABLE'
        ELSE 'OFFLINE'
    END AS current_status
FROM doctors d
LEFT JOIN cabin_doctors cd ON d.doctor_id = cd.doctor_id
    AND cd.shift_date = CURRENT_DATE AND cd.status = 'ACTIVE'
LEFT JOIN cabins c ON cd.cabin_id = c.cabin_id
LEFT JOIN tokens t ON d.doctor_id = t.doctor_id
    AND DATE(t.scheduled_time) = CURRENT_DATE
GROUP BY d.doctor_id, d.name, d.specialization, cd.cabin_id, c.cabin_number, cd.status;
```

---

## STORED PROCEDURES

### 1. Calculate Dynamic ETA

```sql
CREATE OR REPLACE FUNCTION calculate_token_eta(
    p_token_id UUID
) RETURNS INT AS $$
DECLARE
    v_estimated_wait INT;
    v_queue_position INT;
    v_doctor_id UUID;
    v_avg_consult_time INT;
    v_tokens_ahead INT;
    v_current_consult_start TIMESTAMP;
    v_time_elapsed INT;
BEGIN
    -- Get token details
    SELECT doctor_id, queue_position
    INTO v_doctor_id, v_queue_position
    FROM tokens WHERE token_id = p_token_id;

    -- Get doctor's average consultation time
    SELECT COALESCE(avg_consultation_time, 15)
    INTO v_avg_consult_time
    FROM doctors WHERE doctor_id = v_doctor_id;

    -- Count tokens ahead in queue
    SELECT COUNT(*)
    INTO v_tokens_ahead
    FROM tokens
    WHERE doctor_id = v_doctor_id
    AND queue_position < v_queue_position
    AND status IN ('WAITING', 'IN_CONSULTATION');

    -- Factor in current consultation
    SELECT consultation_start_time
    INTO v_current_consult_start
    FROM tokens
    WHERE doctor_id = v_doctor_id
    AND status = 'IN_CONSULTATION'
    LIMIT 1;

    IF v_current_consult_start IS NOT NULL THEN
        v_time_elapsed := EXTRACT(EPOCH FROM (NOW() - v_current_consult_start))/60;
        v_estimated_wait := GREATEST(0, v_avg_consult_time - v_time_elapsed);
    ELSE
        v_estimated_wait := 0;
    END IF;

    -- Add wait time for tokens ahead
    v_estimated_wait := v_estimated_wait + (v_tokens_ahead * v_avg_consult_time);

    -- Add 5-minute buffer per token
    v_estimated_wait := v_estimated_wait + (v_tokens_ahead * 5);

    RETURN v_estimated_wait;
END;
$$ LANGUAGE plpgsql;
```

---

## REDIS DATA STRUCTURES

### Cache Keys Schema

```
# Active Token Queue (Sorted Set by position)
queue:doctor:{doctorId}:active
  → ZADD with score = queue_position

# Token Details (Hash)
token:{tokenId}:details
  → HSET patient_name, status, eta, etc.

# Doctor Status (String with TTL)
doctor:{doctorId}:status → "AVAILABLE" | "BUSY" | "OFFLINE"
  EXPIRE 300 (5 minutes)

# Department Queue Count (String)
dept:{deptId}:queue_count → "24"

# Geo-fencing Data (Geo)
hospital:{hospitalId}:geofence
  → GEOADD latitude longitude doctorId
```

---

## BACKUP & MAINTENANCE

```sql
-- Daily Partition Maintenance
SELECT create_partition_if_not_exists('tokens', CURRENT_DATE + INTERVAL '1 month');

-- Archive Old Tokens (Move to cold storage after 90 days)
CREATE TABLE tokens_archive (LIKE tokens INCLUDING ALL);

-- Vacuum Schedule
VACUUM ANALYZE tokens;
VACUUM ANALYZE token_history;
```

---

## SAMPLE QUERIES

### Get Today's Bottleneck Departments

```sql
SELECT
    d.name,
    COUNT(t.token_id) AS pending_count,
    AVG(t.estimated_wait_time) AS avg_wait,
    COUNT(DISTINCT t.doctor_id) AS active_doctors
FROM tokens t
JOIN departments d ON t.dept_id = d.dept_id
WHERE t.status IN ('WAITING', 'CHECKED_IN')
AND DATE(t.scheduled_time) = CURRENT_DATE
GROUP BY d.dept_id, d.name
HAVING COUNT(t.token_id) > 20
ORDER BY pending_count DESC;
```
