-- Seed Data for OPD Orchestration System
-- Run this in Supabase SQL Editor

-- Insert sample hospital
INSERT INTO hospitals (hospital_id, name, address, latitude, longitude, geofence_radius, type, operating_hours, created_at, updated_at)
VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  'City General Hospital',
  '123 Main Street, City Center',
  28.6139,
  77.2090,
  200,
  'HOSPITAL',
  '{"monday":"09:00-17:00","tuesday":"09:00-17:00","wednesday":"09:00-17:00","thursday":"09:00-17:00","friday":"09:00-17:00","saturday":"09:00-13:00"}'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (hospital_id) DO NOTHING;

-- Insert sample clinic
INSERT INTO hospitals (hospital_id, name, address, latitude, longitude, geofence_radius, type, subscription_tier, monthly_booking_limit, owner_name, owner_email, operating_hours, created_at, updated_at)
VALUES (
  'c1a2b3c4-d5e6-7890-abcd-ef1234567890',
  'Dr. Kumar''s Clinic',
  '456 Park Avenue, Downtown',
  28.6200,
  77.2150,
  100,
  'CLINIC',
  'FREE',
  50,
  'Dr. Amit Kumar',
  'amit.kumar@clinic.com',
  '{"monday":"10:00-18:00","tuesday":"10:00-18:00","wednesday":"10:00-18:00","thursday":"10:00-18:00","friday":"10:00-18:00","saturday":"10:00-14:00","sunday":"closed"}'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (hospital_id) DO NOTHING;

-- Insert sample departments
INSERT INTO departments (dept_id, hospital_id, name, code, avg_consultation_time, buffer_time, color_code, created_at, updated_at)
VALUES
(
  'c47c7e3f-8a5b-4c3d-9f2e-1a2b3c4d5e6f',
  '123e4567-e89b-12d3-a456-426614174000',
  'Cardiology',
  'CARD',
  15,
  5,
  '#3B82F6',
  NOW(),
  NOW()
),
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '123e4567-e89b-12d3-a456-426614174000',
  'General Medicine',
  'GENMED',
  20,
  5,
  '#10B981',
  NOW(),
  NOW()
),
(
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  '123e4567-e89b-12d3-a456-426614174000',
  'Orthopedics',
  'ORTHO',
  25,
  10,
  '#F59E0B',
  NOW(),
  NOW()
),
(
  'd5e6f7a8-b9c0-11de-12fa-131415161718',
  'c1a2b3c4-d5e6-7890-abcd-ef1234567890',
  'General Practice',
  'GEN',
  20,
  5,
  '#10B981',
  NOW(),
  NOW()
) ON CONFLICT (dept_id) DO NOTHING;
-- Insert sample doctors (password: password123)
-- Password hash below is bcrypt hash of 'password123'
INSERT INTO doctors (doctor_id, hospital_id, primary_dept_id, emp_code, name, phone, email, password, specialization, avg_consultation_time, max_tokens_per_session, status, created_at, updated_at)
VALUES
(
  'd1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a',
  '123e4567-e89b-12d3-a456-426614174000',
  'c47c7e3f-8a5b-4c3d-9f2e-1a2b3c4d5e6f',
  'DOC1024',
  'Dr. Sarah Johnson',
  '9876543210',
  'sarah.johnson@hospital.com',
  '$2a$10$rBV2kHSlYqPXqeNOFxYN4eTxU/5w0F/Jf7ys6OqQf7J5Z0qH0xR7Ju',
  'Senior Cardiologist',
  15,
  30,
  'ACTIVE',
  NOW(),
  NOW()
),
(
  'e2f3a4b5-c6d7-8e9f-0a1b-2c3d4e5f6a7b',
  '123e4567-e89b-12d3-a456-426614174000',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'DOC2048',
  'Dr. Rahul Sharma',
  '9876543211',
  'rahul.sharma@hospital.com',
  '$2a$10$rBV2kHSlYqPXqeNOFxYN4eTxU/5w0F/Jf7ys6OqQf7J5Z0qH0xR7Ju',
  'General Physician',
  20,
  40,
  'ACTIVE',
  NOW(),
  NOW()
),
(
  'f3a4b5c6-d7e8-9f0a-1b2c-3d4e5f6a7b8c',
  '123e4567-e89b-12d3-a456-426614174000',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'DOC3072',
  'Dr. Priya Patel',
  '9876543212',
  'priya.patel@hospital.com',
  '$2a$10$rBV2kHSlYqPXqeNOFxYN4eTxU/5w0F/Jf7ys6OqQf7J5Z0qH0xR7Ju',
  'Orthopedic Surgeon',
  25,
  25,
  'ACTIVE',
  NOW(),
  NOW()
),
(
  'c1d2e3f4-5678-9012-3456-789012345678',
  'c1a2b3c4-d5e6-7890-abcd-ef1234567890',
  'd5e6f7a8-b9c0-11de-12fa-131415161718',
  'DOC4096',
  'Dr. Amit Kumar',
  '9876543220',
  'amit.kumar@clinic.com',
  '$2a$10$rBV2kHSlYqPXqeNOFxYN4eTxU/5w0F/Jf7ys6OqQf7J5Z0qH0xR7Ju',
  'General Physician',
  20,
  20,
  'ACTIVE',
  NOW(),
  NOW()
) ON CONFLICT (doctor_id) DO NOTHING;

-- Verify data
SELECT 'Hospitals' as table_name, COUNT(*) as count FROM hospitals
UNION ALL
SELECT 'Departments', COUNT(*) FROM departments
UNION ALL
SELECT 'Doctors', COUNT(*) FROM doctors;
