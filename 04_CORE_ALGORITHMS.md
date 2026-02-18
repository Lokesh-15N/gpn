# Core Algorithms & Logic
## The Brain of Dynamic OPD Orchestration System

---

## 1. DYNAMIC ETA ENGINE

### 1.1 True-Wait-Time Formula

**Core Algorithm:** Calculate realistic patient wait time accounting for real-time deviations.

```
TRUE_WAIT_TIME = BASE_WAIT + DEVIATION_CASCADE + BUFFER_SLOTS + PRIORITY_ADJUSTMENT

Where:
  BASE_WAIT = Tokens_Ahead × Avg_Consultation_Time
  DEVIATION_CASCADE = Current_Consultation_Overtime + Accumulated_Delay
  BUFFER_SLOTS = Tokens_Ahead × 5 minutes (sanitization/transitions)
  PRIORITY_ADJUSTMENT = -10 minutes (if emergency) | 0 (normal) | +5 (late check-in)
```

### 1.2 Pseudo-code Implementation

```python
def calculate_dynamic_eta(token_id):
    """
    Calculate real-time ETA for a patient token
    Returns: estimated_wait_time in minutes
    """

    # Step 1: Fetch token and doctor details
    token = db.get_token(token_id)
    doctor_id = token.doctor_id
    queue_position = token.queue_position

    # Step 2: Get doctor's average consultation time
    doctor = db.get_doctor(doctor_id)
    avg_consult_time = doctor.avg_consultation_time  # e.g., 15 mins

    # Step 3: Count tokens ahead in queue
    tokens_ahead = db.count_tokens_where(
        doctor_id=doctor_id,
        status IN ['WAITING', 'IN_CONSULTATION'],
        queue_position < queue_position
    )

    # Step 4: Calculate BASE_WAIT
    base_wait = tokens_ahead * avg_consult_time

    # Step 5: Calculate DEVIATION_CASCADE (Real-time adjustment)
    current_consultation = db.get_current_consultation(doctor_id)

    if current_consultation:
        # Time elapsed since current consultation started
        elapsed_time = (NOW() - current_consultation.start_time).minutes

        # If doctor is running late on current patient
        if elapsed_time > avg_consult_time:
            current_overtime = elapsed_time - avg_consult_time
        else:
            # Time remaining for current patient
            current_overtime = max(0, avg_consult_time - elapsed_time)
    else:
        current_overtime = 0

    # Step 6: Historical delay factor (learning algorithm)
    today_completion_times = db.get_today_completed_tokens(doctor_id)

    if len(today_completion_times) > 5:  # Minimum sample size
        # Calculate average deviation from scheduled time
        total_deviation = sum([
            (t.actual_time - t.scheduled_time).minutes
            for t in today_completion_times
        ])
        avg_deviation_per_token = total_deviation / len(today_completion_times)
        accumulated_delay = tokens_ahead * avg_deviation_per_token
    else:
        accumulated_delay = 0

    deviation_cascade = current_overtime + accumulated_delay

    # Step 7: Add BUFFER_SLOTS
    buffer_slots = tokens_ahead * 5  # 5 minutes per transition

    # Step 8: PRIORITY_ADJUSTMENT
    if token.priority == 3:  # Emergency
        priority_adjustment = -10
    elif token.check_in_time > token.scheduled_time + 15_MINUTES:
        priority_adjustment = 5  # Penalty for late check-in
    else:
        priority_adjustment = 0

    # Step 9: Calculate TOTAL ETA
    total_eta = base_wait + deviation_cascade + buffer_slots + priority_adjustment

    # Step 10: Bounds check (realistic limits)
    total_eta = max(5, total_eta)  # Minimum 5 mins
    total_eta = min(total_eta, 180)  # Maximum 3 hours (trigger alert)

    # Step 11: Update token with new ETA
    db.update_token(
        token_id=token_id,
        estimated_wait_time=total_eta,
        eta_updated_at=NOW()
    )

    # Step 12: Trigger WebSocket broadcast
    websocket.broadcast(
        channel=f"token:{token_id}",
        event="eta_updated",
        data={
            "estimatedWaitTime": total_eta,
            "queuePosition": queue_position,
            "accuracy": "±5 minutes"
        }
    )

    return total_eta


# Trigger recalculation for all affected tokens
def recalculate_queue_eta(doctor_id, triggering_event):
    """
    Cascade ETA updates when doctor status changes
    """
    affected_tokens = db.get_tokens_where(
        doctor_id=doctor_id,
        status IN ['WAITING', 'CHECKED_IN'],
        scheduled_date=TODAY
    ).order_by('queue_position')

    for token in affected_tokens:
        new_eta = calculate_dynamic_eta(token.token_id)

        # Send notification if wait time increased >15 mins
        if new_eta > token.previous_eta + 15:
            notification_service.send(
                patient_id=token.patient_id,
                channel="PUSH",
                message=f"Updated wait time: {new_eta} minutes"
            )

    logger.info(f"Recalculated ETA for {len(affected_tokens)} tokens")
```

---

## 2. ORCHESTRATOR LEAVE LOGIC

### 2.1 Decision Tree for Unplanned Leave

```
Doctor Declares Leave
        ↓
    Step A: Identify Affected Tokens
        ↓
    Step B: Check Neighboring Capacity
        ↓
    Step C: Redistribution Priority Logic
        ↓
    Decision: Redistribute vs. Reschedule
        ↓
    Execute + Notify Patients
```

### 2.2 Pseudo-code Implementation

```python
def handle_doctor_leave(doctor_id, start_time, end_time, exception_type):
    """
    Intelligent redistribution of tokens when doctor goes on leave
    Returns: redistribution_summary
    """

    # ═══════════════════════════════════════
    # STEP A: IDENTIFY AFFECTED TOKENS
    # ═══════════════════════════════════════
    affected_tokens = db.get_tokens_where(
        doctor_id=doctor_id,
        scheduled_time BETWEEN start_time AND end_time,
        status IN ['BOOKED', 'CHECKED_IN', 'WAITING']
    ).order_by('priority DESC', 'scheduled_time ASC')  # Emergency first

    if len(affected_tokens) == 0:
        return {"status": "NO_ACTION_NEEDED", "affectedCount": 0}

    logger.warning(f"Doctor {doctor_id} leave affects {len(affected_tokens)} tokens")

    # ═══════════════════════════════════════
    # STEP B: CHECK AVAILABLE CAPACITY
    # ═══════════════════════════════════════
    doctor = db.get_doctor(doctor_id)
    same_dept_doctors = db.get_doctors_where(
        primary_dept_id=doctor.primary_dept_id,
        status='ACTIVE',
        doctor_id != doctor_id
    )

    # Calculate available capacity for each alternative doctor
    available_capacity = []

    for alt_doctor in same_dept_doctors:
        # Get today's scheduled tokens for this doctor
        scheduled_count = db.count_tokens_where(
            doctor_id=alt_doctor.doctor_id,
            scheduled_date=start_time.date(),
            status NOT IN ['COMPLETED', 'CANCELLED', 'NO_SHOW']
        )

        # Calculate remaining capacity
        max_capacity = alt_doctor.max_tokens_per_session
        remaining_capacity = max_capacity - scheduled_count

        # Get doctor's current load (real-time)
        current_queue_length = redis.get(f"queue:doctor:{alt_doctor.doctor_id}:length")

        # Check if doctor has available time slots
        shift = db.get_doctor_shift(
            doctor_id=alt_doctor.doctor_id,
            date=start_time.date()
        )

        if shift and remaining_capacity > 0:
            available_capacity.append({
                "doctor_id": alt_doctor.doctor_id,
                "doctor_name": alt_doctor.name,
                "cabin_id": shift.cabin_id,
                "cabin_number": db.get_cabin(shift.cabin_id).cabin_number,
                "remaining_capacity": remaining_capacity,
                "current_queue_length": current_queue_length,
                "avg_consultation_time": alt_doctor.avg_consultation_time,
                "load_score": calculate_load_score(
                    remaining_capacity,
                    current_queue_length
                )
            })

    # Sort by load_score (least loaded first)
    available_capacity.sort(key=lambda x: x['load_score'])

    # ═══════════════════════════════════════
    # STEP C: REDISTRIBUTION PRIORITY LOGIC
    # ═══════════════════════════════════════

    redistribution_plan = {
        "reassigned": [],
        "rescheduled": [],
        "cancelled": []
    }

    for token in affected_tokens:
        patient = db.get_patient(token.patient_id)

        # Priority Factor 1: Patient Distance/Location
        if patient.last_known_location:
            distance_to_hospital = calculate_haversine_distance(
                patient.last_known_location,
                hospital.coordinates
            )
        else:
            distance_to_hospital = None

        # Priority Factor 2: Token Priority (Emergency > Senior > Normal)
        token_priority = token.priority

        # Priority Factor 3: Patient Status
        is_checked_in = token.status == 'CHECKED_IN'

        # DECISION LOGIC
        decision = make_redistribution_decision(
            token=token,
            token_priority=token_priority,
            is_checked_in=is_checked_in,
            distance_to_hospital=distance_to_hospital,
            available_capacity=available_capacity,
            exception_type=exception_type
        )

        if decision['action'] == 'REASSIGN':
            # Find best alternative doctor
            target_doctor = decision['target_doctor']

            # Calculate new time slot
            new_scheduled_time = calculate_next_available_slot(
                doctor_id=target_doctor['doctor_id'],
                preferred_time=token.scheduled_time
            )

            # Update token
            db.update_token(
                token_id=token.token_id,
                doctor_id=target_doctor['doctor_id'],
                cabin_id=target_doctor['cabin_id'],
                scheduled_time=new_scheduled_time,
                queue_position=get_next_queue_position(target_doctor['doctor_id'])
            )

            # Log change
            db.insert_token_history(
                token_id=token.token_id,
                previous_status=token.status,
                new_status=token.status,
                change_reason=f"Doctor leave - reassigned to {target_doctor['doctor_name']}"
            )

            # Send notification
            notification_service.send_multi_channel(
                patient_id=token.patient_id,
                channels=['WHATSAPP', 'SMS', 'PUSH'],
                template='TOKEN_REASSIGNED',
                data={
                    "token_number": token.token_number,
                    "old_doctor": doctor.name,
                    "new_doctor": target_doctor['doctor_name'],
                    "new_cabin": target_doctor['cabin_number'],
                    "new_time": new_scheduled_time.strftime("%I:%M %p"),
                    "reason": "Doctor unavailable due to emergency"
                }
            )

            redistribution_plan['reassigned'].append({
                "tokenId": token.token_id,
                "tokenNumber": token.token_number,
                "newDoctor": target_doctor['doctor_name'],
                "newTime": new_scheduled_time
            })

        elif decision['action'] == 'RESCHEDULE':
            # Suggest next available date
            next_available_date = find_next_available_slot(
                doctor_id=doctor_id,  # Same doctor
                after_date=end_time.date()
            )

            # Update token status to rescheduled (pending confirmation)
            db.update_token(
                token_id=token.token_id,
                status='RESCHEDULED',
                scheduled_time=next_available_date
            )

            # Send notification with reschedule options
            notification_service.send(
                patient_id=token.patient_id,
                channel='WHATSAPP',
                template='RESCHEDULE_REQUEST',
                data={
                    "token_number": token.token_number,
                    "doctor_name": doctor.name,
                    "suggested_date": next_available_date.strftime("%d %B %Y"),
                    "confirm_link": f"https://app.opdsync.com/reschedule/{token.token_id}"
                }
            )

            redistribution_plan['rescheduled'].append({
                "tokenId": token.token_id,
                "tokenNumber": token.token_number,
                "suggestedDate": next_available_date
            })

        else:  # CANCEL (last resort)
            db.update_token(
                token_id=token.token_id,
                status='CANCELLED',
                cancellation_reason='Doctor unavailable - no alternative found'
            )

            notification_service.send(
                patient_id=token.patient_id,
                channel='PHONE_CALL',  # Escalate to call for cancellations
                message=f"Appointment cancelled. Please call {hospital.phone} to reschedule."
            )

            redistribution_plan['cancelled'].append({
                "tokenId": token.token_id,
                "tokenNumber": token.token_number
            })

    # Update leave record with summary
    db.update_schedule_exception(
        exception_id=exception_id,
        affected_tokens_count=len(affected_tokens),
        redistribution_status='COMPLETED',
        redistribution_summary=redistribution_plan
    )

    # Trigger admin alert
    system_alert.create(
        alert_type='LEAVE_HANDLED',
        severity='WARNING',
        message=f"Doctor {doctor.name} leave processed: {len(redistribution_plan['reassigned'])} reassigned, {len(redistribution_plan['rescheduled'])} rescheduled",
        metadata=redistribution_plan
    )

    return redistribution_plan


def make_redistribution_decision(token, token_priority, is_checked_in,
                                   distance_to_hospital, available_capacity,
                                   exception_type):
    """
    Decision algorithm: Reassign vs Reschedule vs Cancel
    """

    # RULE 1: Emergency tokens MUST be reassigned
    if token_priority == 3:  # Emergency
        if len(available_capacity) > 0:
            return {
                "action": "REASSIGN",
                "target_doctor": available_capacity[0],
                "reason": "Emergency priority"
            }
        else:
            # Escalate to admin for manual intervention
            return {
                "action": "ESCALATE",
                "reason": "Emergency token with no capacity"
            }

    # RULE 2: Already checked-in patients (physically present)
    if is_checked_in:
        if len(available_capacity) > 0:
            # Find doctor with shortest current queue
            best_option = min(available_capacity,
                            key=lambda x: x['current_queue_length'])
            return {
                "action": "REASSIGN",
                "target_doctor": best_option,
                "reason": "Patient already at hospital"
            }
        else:
            # No capacity - offer to wait or reschedule
            return {
                "action": "RESCHEDULE",
                "reason": "No available capacity for reassignment"
            }

    # RULE 3: Patient is nearby (within 5km)
    if distance_to_hospital and distance_to_hospital < 5.0:
        if len(available_capacity) >= 2:  # At least 2 options
            return {
                "action": "REASSIGN",
                "target_doctor": available_capacity[0],
                "reason": "Patient nearby, capacity available"
            }
        else:
            return {
                "action": "RESCHEDULE",
                "reason": "Patient nearby but limited capacity"
            }

    # RULE 4: Unplanned/Emergency leave - bias towards reassignment
    if exception_type == 'UNPLANNED_LEAVE' or exception_type == 'EMERGENCY':
        if len(available_capacity) > 0:
            # Distribute load across multiple doctors
            least_loaded = available_capacity[0]
            if least_loaded['remaining_capacity'] >= 5:  # Has buffer
                return {
                    "action": "REASSIGN",
                    "target_doctor": least_loaded,
                    "reason": "Emergency leave - reassigning"
                }

    # RULE 5: Default - Reschedule with same doctor
    return {
        "action": "RESCHEDULE",
        "reason": "Default reschedule with original doctor"
    }


def calculate_load_score(remaining_capacity, current_queue_length):
    """
    Lower score = better option
    """
    if remaining_capacity <= 0:
        return 9999  # Exclude from selection

    # Weight current queue more heavily
    score = (current_queue_length * 2) + (50 - remaining_capacity)
    return score
```

---

## 3. GEO-FENCING LOGIC

### 3.1 Haversine Formula Implementation

```python
import math

def calculate_haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate distance between two GPS coordinates
    Returns: distance in meters
    """
    # Earth's radius in meters
    R = 6371000

    # Convert degrees to radians
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    # Haversine formula
    a = (math.sin(delta_phi / 2) ** 2 +
         math.cos(phi1) * math.cos(phi2) *
         math.sin(delta_lambda / 2) ** 2)

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    distance = R * c  # meters

    return distance


def validate_check_in_location(token_id, patient_lat, patient_lon):
    """
    Verify patient is within geofence before allowing check-in
    """

    # Get token and hospital details
    token = db.get_token(token_id)
    hospital = db.get_hospital(token.hospital_id)

    hospital_lat = hospital.latitude
    hospital_lon = hospital.longitude
    geofence_radius = hospital.geofence_radius  # e.g., 200 meters

    # Calculate distance
    distance = calculate_haversine_distance(
        patient_lat, patient_lon,
        hospital_lat, hospital_lon
    )

    # Check if within geofence
    if distance <= geofence_radius:
        # Allow check-in
        db.update_token(
            token_id=token_id,
            status='CHECKED_IN',
            check_in_time=NOW(),
            check_in_latitude=patient_lat,
            check_in_longitude=patient_lon
        )

        # Update queue position
        new_queue_position = get_current_queue_length(token.doctor_id) + 1
        db.update_token(token_id=token_id, queue_position=new_queue_position)

        # Recalculate ETA
        calculate_dynamic_eta(token_id)

        return {
            "success": True,
            "message": "Check-in successful",
            "distance": round(distance, 1)
        }
    else:
        # Reject check-in
        return {
            "success": False,
            "error_code": "GEOFENCE_VIOLATION",
            "message": f"You must be within {geofence_radius}m of the hospital",
            "current_distance": round(distance, 1),
            "required_distance": geofence_radius
        }


def handle_early_check_in_prevention(token_id):
    """
    Prevent 'dead tokens' - patients who book but never show up
    """
    token = db.get_token(token_id)

    # Check if patient checked in earlier than scheduled
    time_until_appointment = (token.scheduled_time - NOW()).total_seconds() / 60

    if time_until_appointment > 60:  # More than 1 hour early
        return {
            "success": False,
            "error_code": "TOO_EARLY",
            "message": f"Check-in opens 1 hour before appointment",
            "scheduled_time": token.scheduled_time,
            "check_in_opens_at": token.scheduled_time - timedelta(hours=1)
        }

    return {"success": True}
```

---

## 4. MULTI-CHANNEL ALERTING ALGORITHM

### 4.1 T-Minus Alert System

```python
def monitor_queue_and_send_alerts():
    """
    Background job that runs every 30 seconds
    Sends alerts when patient is 3 tokens away
    """

    # Get all active consultations
    active_consultations = db.get_tokens_where(
        status='IN_CONSULTATION',
        scheduled_date=TODAY
    )

    for consultation in active_consultations:
        doctor_id = consultation.doctor_id

        # Get next 5 tokens in queue
        upcoming_tokens = db.get_tokens_where(
            doctor_id=doctor_id,
            status='WAITING',
            queue_position > consultation.queue_position
        ).order_by('queue_position').limit(5)

        for token in upcoming_tokens:
            tokens_ahead = token.queue_position - consultation.queue_position - 1

            # T-Minus-3 Alert
            if tokens_ahead == 3:
                alert_key = f"alert:tminus3:{token.token_id}"

                # Check if alert already sent (prevent duplicates)
                if not redis.exists(alert_key):
                    send_tminus_alert(token, tokens_ahead)
                    redis.setex(alert_key, 3600, "SENT")  # TTL 1 hour

            # T-Minus-1 Alert (Immediate call)
            elif tokens_ahead == 1:
                alert_key = f"alert:tminus1:{token.token_id}"

                if not redis.exists(alert_key):
                    send_immediate_call_alert(token)
                    redis.setex(alert_key, 3600, "SENT")


def send_tminus_alert(token, tokens_ahead):
    """
    Send multi-channel notification: 3 patients ahead
    """
    patient = db.get_patient(token.patient_id)

    # Determine channel priority based on patient preferences
    channels = []
    if patient.whatsapp_opt_in:
        channels.append('WHATSAPP')
    if patient.sms_opt_in:
        channels.append('SMS')
    if patient.fcm_token:
        channels.append('PUSH')

    message_data = {
        "token_number": token.token_number,
        "tokens_ahead": tokens_ahead,
        "estimated_wait": token.estimated_wait_time,
        "doctor_name": db.get_doctor(token.doctor_id).name,
        "cabin_number": db.get_cabin(token.cabin_id).cabin_number
    }

    # Send via all available channels (parallel)
    for channel in channels:
        notification_service.send_async(
            patient_id=patient.patient_id,
            token_id=token.token_id,
            channel=channel,
            event_type='T_MINUS_3',
            template=get_template(channel, 'T_MINUS_3'),
            data=message_data
        )

    logger.info(f"T-minus-3 alert sent for token {token.token_number} via {channels}")


def send_immediate_call_alert(token):
    """
    High-priority notification: Your turn is next
    """
    patient = db.get_patient(token.patient_id)

    # Use highest priority channels
    notification_service.send_priority(
        patient_id=patient.patient_id,
        token_id=token.token_id,
        channels=['PUSH', 'WHATSAPP'],  # Push first for immediate delivery
        event_type='CALL_NOW',
        message="Your turn is next! Please proceed to the cabin.",
        priority='URGENT',
        sound='alert_tone.mp3',
        vibration_pattern=[0, 500, 200, 500]
    )

    # Also broadcast to display boards
    websocket.broadcast(
        channel=f"display_board:{token.dept_id}",
        event='token:calling_next',
        data={
            "tokenNumber": token.token_number,
            "cabinNumber": db.get_cabin(token.cabin_id).cabin_number,
            "animation": "blink"
        }
    )


def get_template(channel, event_type):
    """
    Get localized message template
    """
    templates = {
        'WHATSAPP': {
            'T_MINUS_3': """
🏥 *OPD Update*

Your Token: *{token_number}*
Doctor: {doctor_name}
Cabin: {cabin_number}

⏳ {tokens_ahead} patients ahead of you
⏰ Estimated wait: {estimated_wait} minutes

Please be ready!
            """,
            'CALL_NOW': """
🔔 *Your Turn!*

Token: *{token_number}*
📍 Please proceed to Cabin {cabin_number}

Doctor {doctor_name} is ready to see you now.
            """
        },
        'SMS': {
            'T_MINUS_3': "OPD Update: Token {token_number} - {tokens_ahead} patients ahead. Est. wait: {estimated_wait} mins. Cabin: {cabin_number}",
            'CALL_NOW': "URGENT: Token {token_number} - Please proceed to Cabin {cabin_number} NOW. Dr. {doctor_name} is ready."
        }
    }

    return templates[channel][event_type]
```

---

## 5. ADMIN HEATMAP ALGORITHM

### 5.1 Bottleneck Detection

```python
def generate_department_heatmap(hospital_id, date):
    """
    Analyze queue patterns and identify bottlenecks
    Returns: heatmap data with color-coded urgency
    """

    departments = db.get_departments(hospital_id)
    heatmap_data = []

    for dept in departments:
        # Get hourly queue statistics
        hourly_stats = []

        for hour in range(8, 20):  # 8 AM to 8 PM
            start_time = datetime.combine(date, time(hour, 0))
            end_time = start_time + timedelta(hours=1)

            # Count tokens in this hour
            tokens_in_hour = db.count_tokens_where(
                dept_id=dept.dept_id,
                scheduled_time BETWEEN start_time AND end_time
            )

            # Get average wait time
            avg_wait = db.query(f"""
                SELECT AVG(estimated_wait_time)
                FROM tokens
                WHERE dept_id = '{dept.dept_id}'
                AND scheduled_time BETWEEN '{start_time}' AND '{end_time}'
            """).scalar() or 0

            # Count active doctors in this hour
            active_doctors = db.count_doctors_where(
                primary_dept_id=dept.dept_id,
                has_shift_at=start_time
            )

            # Calculate queue-to-doctor ratio
            if active_doctors > 0:
                queue_per_doctor = tokens_in_hour / active_doctors
            else:
                queue_per_doctor = 999  # No doctor = critical

            # Determine heat level
            heat_level = calculate_heat_level(
                queue_per_doctor=queue_per_doctor,
                avg_wait_time=avg_wait
            )

            hourly_stats.append({
                "hour": start_time.strftime("%H:00"),
                "queueLength": tokens_in_hour,
                "avgWaitTime": round(avg_wait, 1),
                "activeDoctors": active_doctors,
                "queuePerDoctor": round(queue_per_doctor, 1),
                "heatLevel": heat_level,
                "colorCode": get_heat_color(heat_level)
            })

        # Find peak hour
        peak_hour_data = max(hourly_stats, key=lambda x: x['queueLength'])

        # Generate recommendation
        recommendation = generate_recommendation(
            dept=dept,
            hourly_stats=hourly_stats,
            peak_hour=peak_hour_data
        )

        heatmap_data.append({
            "deptId": dept.dept_id,
            "deptName": dept.name,
            "hourlyData": hourly_stats,
            "peakHour": peak_hour_data['hour'],
            "recommendation": recommendation
        })

    return heatmap_data


def calculate_heat_level(queue_per_doctor, avg_wait_time):
    """
    Determine bottleneck severity
    Returns: GREEN | YELLOW | ORANGE | RED
    """

    # Scoring system
    score = 0

    # Factor 1: Queue per doctor
    if queue_per_doctor > 20:
        score += 3
    elif queue_per_doctor > 10:
        score += 2
    elif queue_per_doctor > 5:
        score += 1

    # Factor 2: Average wait time
    if avg_wait_time > 60:
        score += 3
    elif avg_wait_time > 30:
        score += 2
    elif avg_wait_time > 15:
        score += 1

    # Map score to heat level
    if score >= 5:
        return "RED"       # Critical
    elif score >= 3:
        return "ORANGE"    # Warning
    elif score >= 1:
        return "YELLOW"    # Caution
    else:
        return "GREEN"     # Normal


def get_heat_color(heat_level):
    """Map heat level to RGB color"""
    colors = {
        "GREEN": "#00FF00",
        "YELLOW": "#FFFF00",
        "ORANGE": "#FFA500",
        "RED": "#FF0000"
    }
    return colors[heat_level]


def generate_recommendation(dept, hourly_stats, peak_hour):
    """
    AI-driven recommendation for optimization
    """

    # Count critical hours
    critical_hours = [h for h in hourly_stats if h['heatLevel'] == 'RED']
    warning_hours = [h for h in hourly_stats if h['heatLevel'] == 'ORANGE']

    if len(critical_hours) > 2:
        return f"URGENT: Add 2 doctors during {critical_hours[0]['hour']}-{critical_hours[-1]['hour']}"

    elif len(warning_hours) > 3:
        return f"Consider adding 1 doctor at {peak_hour['hour']} slot"

    elif peak_hour['queuePerDoctor'] > 15:
        return f"Extend consultation hours by 1 hour"

    else:
        return "Staffing levels optimal"
```

---

## 6. QUEUE OPTIMIZATION ALGORITHMS

### 6.1 Smart Token Assignment

```python
def assign_optimal_doctor(patient_id, dept_id, preferred_time):
    """
    Assign patient to doctor with best fit
    Factors: Doctor load, patient history, specialty match
    """

    # Get all available doctors in department
    available_doctors = db.get_doctors_where(
        primary_dept_id=dept_id,
        status='ACTIVE',
        has_shift_on=preferred_time.date()
    )

    # Score each doctor
    doctor_scores = []

    for doctor in available_doctors:
        score = 0

        # Factor 1: Current load (lower is better)
        current_load = db.count_tokens_where(
            doctor_id=doctor.doctor_id,
            scheduled_date=preferred_time.date(),
            status NOT IN ['COMPLETED', 'CANCELLED']
        )
        max_capacity = doctor.max_tokens_per_session
        load_percentage = (current_load / max_capacity) * 100

        if load_percentage < 50:
            score += 50
        elif load_percentage < 75:
            score += 25
        # Over 75% -> no bonus

        # Factor 2: Patient history (has seen this doctor before)
        past_consultations = db.count_tokens_where(
            patient_id=patient_id,
            doctor_id=doctor.doctor_id,
            status='COMPLETED'
        )

        if past_consultations > 0:
            score += 30  # Continuity of care bonus

        # Factor 3: Doctor efficiency (faster consultations)
        if doctor.avg_consultation_time < 12:
            score += 20

        doctor_scores.append({
            "doctor_id": doctor.doctor_id,
            "doctor_name": doctor.name,
            "score": score,
            "current_load": current_load,
            "load_percentage": load_percentage
        })

    # Select doctor with highest score
    best_doctor = max(doctor_scores, key=lambda x: x['score'])

    return best_doctor['doctor_id']
```

---

## 7. PERFORMANCE MONITORING

### 7.1 Real-Time Metrics Collection

```python
def collect_system_metrics():
    """
    Background job: Collect and store performance metrics
    Runs every 5 minutes
    """

    timestamp = NOW()

    # Metric 1: Average wait time across all departments
    avg_wait_query = """
        SELECT dept_id, AVG(estimated_wait_time) as avg_wait
        FROM tokens
        WHERE status IN ('WAITING', 'CHECKED_IN')
        AND scheduled_date = CURRENT_DATE
        GROUP BY dept_id
    """
    wait_times = db.execute(avg_wait_query).fetchall()

    for dept_id, avg_wait in wait_times:
        influxdb.write_point(
            measurement='queue_wait_time',
            tags={'dept_id': dept_id},
            fields={'value': avg_wait},
            timestamp=timestamp
        )

    # Metric 2: Queue length per doctor
    # ... similar pattern

    # Metric 3: Consultation completion rate
    # ... similar pattern

    # Trigger alerts if thresholds exceeded
    check_and_create_alerts(wait_times)
```

This comprehensive algorithm suite forms the intelligent core of the OPD system!
