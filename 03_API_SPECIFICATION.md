# API Endpoints Specification
## RESTful API Design for OPD Orchestration System

**Base URL:** `https://api.opdsync.hospital/v1`
**Authentication:** Bearer JWT Token
**Content-Type:** `application/json`

---

## 1. AUTHENTICATION APIs

### 1.1 Patient Registration/Login

**Endpoint:** `POST /auth/patient/register`

**Request:**
```json
{
  "phone": "+919876543210",
  "name": "Rajesh Kumar",
  "hospitalId": "uuid",
  "otp": "123456"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "patientId": "uuid",
    "uhid": "H001234",
    "accessToken": "eyJhbGciOiJIUzI1...",
    "refreshToken": "eyJhbGciOiJIUzI1...",
    "expiresIn": 900
  }
}
```

---

### 1.2 Doctor Login

**Endpoint:** `POST /auth/doctor/login`

**Request:**
```json
{
  "empCode": "DOC1024",
  "password": "hashed_password",
  "hospitalId": "uuid"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "doctorId": "uuid",
    "name": "Dr. Sharma",
    "specialization": "Cardiology",
    "accessToken": "eyJhbGciOiJIUzI1...",
    "permissions": ["VIEW_QUEUE", "MANAGE_TOKENS", "UPDATE_STATUS"]
  }
}
```

---

### 1.3 Refresh Token

**Endpoint:** `POST /auth/refresh`

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1..."
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "accessToken": "new_jwt_token",
    "expiresIn": 900
  }
}
```

---

## 2. TOKEN MANAGEMENT APIs

### 2.1 Request New Token

**Endpoint:** `POST /tokens/request`

**Authorization:** Patient Bearer Token

**Request:**
```json
{
  "patientId": "uuid",
  "departmentId": "uuid",
  "doctorId": "uuid",              // Optional (auto-assign if null)
  "bookingType": "ONLINE",
  "scheduledDate": "2026-02-20",
  "preferredTime": "10:00:00",     // Optional
  "visitReason": "Chest pain",
  "priority": 1                     // 1=Normal, 2=Senior, 3=Emergency
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "tokenId": "uuid",
    "tokenNumber": "CARD-025",
    "queuePosition": 12,
    "estimatedWaitTime": 45,        // Minutes
    "doctor": {
      "name": "Dr. Sharma",
      "cabin": "C-201"
    },
    "scheduledTime": "2026-02-20T10:30:00Z",
    "instructions": "Please arrive 15 minutes early",
    "checkInWindow": {
      "from": "2026-02-20T09:00:00Z",
      "to": "2026-02-20T12:00:00Z"
    }
  }
}
```

---

### 2.2 Check-In Token (Geo-Fenced)

**Endpoint:** `PATCH /tokens/{tokenId}/check-in`

**Authorization:** Patient Bearer Token

**Request:**
```json
{
  "latitude": 28.7041,
  "longitude": 77.1025
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "tokenId": "uuid",
    "status": "CHECKED_IN",
    "queuePosition": 8,
    "estimatedWaitTime": 25,
    "message": "You're checked in! Proceed to waiting area.",
    "tokensAhead": 7
  }
}
```

**Error Response:** `400 Bad Request` (Out of geofence)
```json
{
  "success": false,
  "error": {
    "code": "GEOFENCE_VIOLATION",
    "message": "You must be within 200m of the hospital to check-in",
    "currentDistance": 450
  }
}
```

---

### 2.3 Get Token Details

**Endpoint:** `GET /tokens/{tokenId}`

**Authorization:** Patient/Doctor Bearer Token

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "tokenId": "uuid",
    "tokenNumber": "CARD-025",
    "status": "WAITING",
    "patient": {
      "name": "Rajesh Kumar",
      "uhid": "H001234"
    },
    "doctor": {
      "name": "Dr. Sharma",
      "specialization": "Cardiology",
      "cabin": "C-201"
    },
    "timeline": {
      "booked": "2026-02-20T08:00:00Z",
      "checkedIn": "2026-02-20T09:45:00Z",
      "estimated": "2026-02-20T10:15:00Z"
    },
    "queuePosition": 3,
    "estimatedWaitTime": 12,
    "lastUpdated": "2026-02-20T10:03:00Z"
  }
}
```

---

### 2.4 Cancel Token

**Endpoint:** `DELETE /tokens/{tokenId}`

**Authorization:** Patient/Admin Bearer Token

**Request:**
```json
{
  "reason": "Unable to attend"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Token cancelled successfully",
  "refundEligible": false
}
```

---

### 2.5 Get Patient's Tokens

**Endpoint:** `GET /patients/{patientId}/tokens`

**Query Parameters:**
- `status` (optional): `BOOKED|CHECKED_IN|COMPLETED`
- `from` (optional): `2026-02-01`
- `to` (optional): `2026-02-28`
- `limit` (default: 20)
- `offset` (default: 0)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "tokens": [
      {
        "tokenId": "uuid",
        "tokenNumber": "CARD-025",
        "status": "COMPLETED",
        "doctorName": "Dr. Sharma",
        "department": "Cardiology",
        "scheduledTime": "2026-02-20T10:00:00Z",
        "actualTime": "2026-02-20T10:35:00Z"
      }
    ],
    "pagination": {
      "total": 45,
      "limit": 20,
      "offset": 0
    }
  }
}
```

---

## 3. DOCTOR CONSOLE APIs

### 3.1 Get Doctor's Queue

**Endpoint:** `GET /doctors/{doctorId}/queue`

**Authorization:** Doctor Bearer Token

**Query Parameters:**
- `date` (optional): `2026-02-20` (default: today)
- `status` (optional): `WAITING|IN_CONSULTATION`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "currentToken": {
      "tokenId": "uuid",
      "tokenNumber": "CARD-023",
      "patientName": "Amit Verma",
      "uhid": "H005678",
      "visitReason": "Follow-up",
      "status": "IN_CONSULTATION",
      "consultationDuration": 8,    // Minutes elapsed
      "vitals": {
        "bp": "120/80",
        "temp": "98.6F"
      }
    },
    "upcomingTokens": [
      {
        "queuePosition": 1,
        "tokenNumber": "CARD-024",
        "patientName": "Sunita Rao",
        "estimatedTime": "2026-02-20T10:22:00Z",
        "priority": 2,
        "isCheckedIn": true
      },
      {
        "queuePosition": 2,
        "tokenNumber": "CARD-025",
        "patientName": "Rajesh Kumar",
        "estimatedTime": "2026-02-20T10:37:00Z",
        "priority": 1,
        "isCheckedIn": true
      }
    ],
    "stats": {
      "completed": 18,
      "pending": 12,
      "noShow": 2,
      "avgConsultTime": 14
    }
  }
}
```

---

### 3.2 Start Consultation

**Endpoint:** `POST /consultations/start`

**Authorization:** Doctor Bearer Token

**Request:**
```json
{
  "tokenId": "uuid",
  "doctorId": "uuid"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "consultationId": "uuid",
    "tokenNumber": "CARD-024",
    "patientName": "Sunita Rao",
    "startedAt": "2026-02-20T10:22:15Z",
    "medicalHistory": [
      {
        "date": "2026-01-15",
        "diagnosis": "Hypertension",
        "medication": "Amlodipine 5mg"
      }
    ]
  },
  "websocketEvent": "TOKEN_STATUS_CHANGED"  // Triggers queue update
}
```

---

### 3.3 Complete Consultation

**Endpoint:** `POST /consultations/{consultationId}/complete`

**Authorization:** Doctor Bearer Token

**Request:**
```json
{
  "diagnosis": "Stable angina",
  "prescription": [
    {
      "medicine": "Aspirin",
      "dosage": "75mg",
      "frequency": "Once daily"
    }
  ],
  "nextVisit": "2026-03-20",
  "notes": "Patient advised to reduce salt intake"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "tokenId": "uuid",
    "status": "COMPLETED",
    "duration": 12,
    "nextToken": {
      "tokenNumber": "CARD-025",
      "patientName": "Rajesh Kumar",
      "notificationSent": true
    }
  }
}
```

---

### 3.4 Mark Patient No-Show

**Endpoint:** `PATCH /tokens/{tokenId}/no-show`

**Authorization:** Doctor Bearer Token

**Request:**
```json
{
  "doctorId": "uuid",
  "reason": "Called 3 times, no response"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "tokenId": "uuid",
    "status": "NO_SHOW",
    "nextTokenCalled": true,
    "nextTokenNumber": "CARD-026"
  }
}
```

---

### 3.5 Update Doctor Status

**Endpoint:** `PATCH /doctors/{doctorId}/status`

**Authorization:** Doctor Bearer Token

**Request:**
```json
{
  "status": "ON_BREAK",           // AVAILABLE, BUSY, ON_BREAK, OFFLINE
  "resumeTime": "2026-02-20T11:00:00Z"  // Optional
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "doctorId": "uuid",
    "status": "ON_BREAK",
    "pendingTokens": 8,
    "affectedTokensNotified": true
  }
}
```

---

## 4. LEAVE MANAGEMENT APIs

### 4.1 Declare Doctor Leave

**Endpoint:** `POST /doctors/{doctorId}/leave`

**Authorization:** Doctor/Admin Bearer Token

**Request:**
```json
{
  "exceptionType": "UNPLANNED_LEAVE",
  "startDatetime": "2026-02-20T14:00:00Z",
  "endDatetime": "2026-02-20T18:00:00Z",
  "reason": "Medical emergency"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "exceptionId": "uuid",
    "affectedTokens": 15,
    "redistributionStatus": "IN_PROGRESS",
    "redistributionPlan": {
      "reassigned": 8,
      "rescheduled": 7,
      "targetDoctors": [
        {
          "doctorId": "uuid",
          "name": "Dr. Mehta",
          "tokensAssigned": 5,
          "capacity": "AVAILABLE"
        }
      ]
    },
    "estimatedCompletionTime": "2026-02-20T10:35:00Z"
  }
}
```

---

### 4.2 Get Leave Redistribution Status

**Endpoint:** `GET /leave/{exceptionId}/redistribution`

**Authorization:** Doctor/Admin Bearer Token

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "exceptionId": "uuid",
    "status": "COMPLETED",
    "summary": {
      "totalAffected": 15,
      "reassigned": 8,
      "rescheduled": 7,
      "cancelled": 0
    },
    "actions": [
      {
        "tokenNumber": "CARD-030",
        "action": "REASSIGNED",
        "fromDoctor": "Dr. Sharma",
        "toDoctor": "Dr. Mehta",
        "newTime": "2026-02-20T15:30:00Z",
        "notified": true
      }
    ]
  }
}
```

---

## 5. ADMIN DASHBOARD APIs

### 5.1 Get Real-Time System Overview

**Endpoint:** `GET /admin/dashboard/overview`

**Authorization:** Admin Bearer Token

**Query Parameters:**
- `hospitalId`: `uuid`
- `date`: `2026-02-20` (default: today)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalTokens": 450,
      "completed": 320,
      "inProgress": 15,
      "waiting": 85,
      "noShow": 30
    },
    "departments": [
      {
        "deptId": "uuid",
        "name": "Cardiology",
        "queueLength": 25,
        "activeDoctors": 3,
        "avgWaitTime": 35,
        "bottleneckLevel": "CRITICAL",
        "colorCode": "#FF0000"
      },
      {
        "deptId": "uuid",
        "name": "Orthopedics",
        "queueLength": 12,
        "activeDoctors": 2,
        "avgWaitTime": 18,
        "bottleneckLevel": "NORMAL",
        "colorCode": "#00FF00"
      }
    ],
    "alerts": [
      {
        "alertId": "uuid",
        "type": "BOTTLENECK",
        "severity": "CRITICAL",
        "message": "Cardiology queue exceeds 20 patients for 30 minutes",
        "createdAt": "2026-02-20T10:15:00Z"
      }
    ],
    "lastUpdated": "2026-02-20T10:30:45Z"
  }
}
```

---

### 5.2 Get Department Heatmap Data

**Endpoint:** `GET /admin/heatmap`

**Authorization:** Admin Bearer Token

**Query Parameters:**
- `hospitalId`: `uuid`
- `date`: `2026-02-20`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "heatmapData": [
      {
        "deptId": "uuid",
        "deptName": "Cardiology",
        "hourlyData": [
          {
            "hour": "09:00",
            "queueLength": 15,
            "avgWaitTime": 25,
            "heatLevel": "YELLOW"
          },
          {
            "hour": "10:00",
            "queueLength": 28,
            "avgWaitTime": 45,
            "heatLevel": "RED"
          }
        ],
        "peakHour": "10:00",
        "recommendation": "Add 1 doctor at 10:00 slot"
      }
    ]
  }
}
```

---

### 5.3 Get Doctor Performance Report

**Endpoint:** `GET /admin/reports/doctor-performance`

**Authorization:** Admin Bearer Token

**Query Parameters:**
- `doctorId`: `uuid` (optional, all if not specified)
- `fromDate`: `2026-02-01`
- `toDate`: `2026-02-28`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "doctors": [
      {
        "doctorId": "uuid",
        "name": "Dr. Sharma",
        "metrics": {
          "totalTokens": 320,
          "completedTokens": 295,
          "noShowRate": 7.8,
          "avgConsultTime": 14.5,
          "avgWaitTime": 22,
          "utilizationRate": 85.3,
          "patientSatisfaction": 4.6,
          "punctualityScore": 92
        },
        "trends": {
          "consultTimeChange": -2.1,    // % change vs previous period
          "efficiencyScore": 88
        }
      }
    ]
  }
}
```

---

## 6. NOTIFICATION APIs

### 6.1 Send Manual Notification

**Endpoint:** `POST /notifications/send`

**Authorization:** Admin Bearer Token

**Request:**
```json
{
  "patientIds": ["uuid1", "uuid2"],
  "channel": "WHATSAPP",
  "message": "Your appointment has been rescheduled",
  "priority": "HIGH"
}
```

**Response:** `202 Accepted`
```json
{
  "success": true,
  "data": {
    "notificationId": "uuid",
    "recipientCount": 2,
    "status": "QUEUED",
    "estimatedDeliveryTime": "2026-02-20T10:32:00Z"
  }
}
```

---

### 6.2 Get Notification Status

**Endpoint:** `GET /notifications/{notificationId}/status`

**Authorization:** Patient/Admin Bearer Token

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "notificationId": "uuid",
    "channel": "WHATSAPP",
    "deliveryStatus": "DELIVERED",
    "sentAt": "2026-02-20T10:31:45Z",
    "deliveredAt": "2026-02-20T10:31:52Z",
    "readAt": "2026-02-20T10:32:10Z"
  }
}
```

---

## 7. WEBSOCKET EVENTS

**Connection:** `wss://api.opdsync.hospital/socket.io`

### 7.1 Events for Patients

```javascript
// Subscribe to token updates
socket.emit('subscribe', {
  channel: 'token',
  tokenId: 'uuid'
});

// Receive events
socket.on('token:position_updated', (data) => {
  // { queuePosition: 3, estimatedWaitTime: 12 }
});

socket.on('token:call_alert', (data) => {
  // { message: "Please proceed to Cabin C-201", tokenNumber: "CARD-025" }
});

socket.on('token:tminus3', (data) => {
  // { message: "3 patients ahead of you", estimatedWaitTime: 9 }
});
```

---

### 7.2 Events for Doctors

```javascript
// Subscribe to doctor queue
socket.emit('subscribe', {
  channel: 'doctor_queue',
  doctorId: 'uuid'
});

// Receive events
socket.on('queue:new_patient_checked_in', (data) => {
  // { tokenNumber: "CARD-030", patientName: "...", queueLength: 13 }
});

socket.on('queue:patient_no_show', (data) => {
  // { tokenNumber: "CARD-028", reason: "Called 3 times" }
});
```

---

### 7.3 Events for Display Boards

```javascript
// Subscribe to department queue
socket.emit('subscribe', {
  channel: 'display_board',
  deptId: 'uuid'
});

// Receive events
socket.on('display:token_called', (data) => {
  // { tokenNumber: "CARD-025", cabinNumber: "C-201", status: "PLEASE_PROCEED" }
});

socket.on('display:queue_update', (data) => {
  // { waitingTokens: ["CARD-026", "CARD-027", ...], avgWaitTime: 25 }
});
```

---

## 8. ERROR HANDLING

### Standard Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "phone",
        "issue": "Phone number must be 10 digits"
      }
    ],
    "timestamp": "2026-02-20T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

### HTTP Status Codes

| Code | Meaning | Use Case |
|------|---------|----------|
| 200 | OK | Successful GET/PATCH request |
| 201 | Created | Successful POST (resource created) |
| 202 | Accepted | Request accepted for async processing |
| 400 | Bad Request | Invalid input parameters |
| 401 | Unauthorized | Missing or invalid auth token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate token/booking conflict |
| 422 | Unprocessable | Valid syntax but business logic error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |
| 503 | Service Unavailable | Maintenance mode |

---

## 9. RATE LIMITING

**Limits Per Endpoint:**
- `/tokens/request`: 5 requests/minute per patient
- `/tokens/{id}/check-in`: 10 requests/minute per patient
- `/doctors/{id}/queue`: 60 requests/minute per doctor
- `/admin/*`: 100 requests/minute per admin
- WebSocket connections: 1000 messages/minute per connection

**Rate Limit Headers:**
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1645358400
```

---

## 10. PAGINATION

**Query Parameters:**
- `limit`: Items per page (default: 20, max: 100)
- `offset`: Starting position (default: 0)

**Response Format:**
```json
{
  "data": [...],
  "pagination": {
    "total": 450,
    "limit": 20,
    "offset": 40,
    "hasMore": true
  }
}
```
