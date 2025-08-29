-- Dummy Data for Beehive Platform Testing
-- ZIP codes: 10001 (NYC), 94102 (SF), 60601 (Chicago), 90210 (Beverly Hills), 
-- 33139 (Miami Beach), 02108 (Boston), 98101 (Seattle), 78701 (Austin)

-- First, create test users in Supabase auth.users table (if not exists)
-- Note: In production, these would be created through Firebase Auth first

-- Insert Users (both caregivers and care seekers)
INSERT INTO users (id, firebase_uid, email, role, created_at, updated_at) VALUES
-- Caregivers
('11111111-1111-1111-1111-111111111111', 'firebase_cg_1', 'sarah.johnson@example.com', 'caregiver', NOW(), NOW()),
('22222222-2222-2222-2222-222222222222', 'firebase_cg_2', 'maria.garcia@example.com', 'caregiver', NOW(), NOW()),
('33333333-3333-3333-3333-333333333333', 'firebase_cg_3', 'jennifer.chen@example.com', 'caregiver', NOW(), NOW()),
('44444444-4444-4444-4444-444444444444', 'firebase_cg_4', 'emily.wilson@example.com', 'caregiver', NOW(), NOW()),
('55555555-5555-5555-5555-555555555555', 'firebase_cg_5', 'patricia.brown@example.com', 'caregiver', NOW(), NOW()),
('66666666-6666-6666-6666-666666666666', 'firebase_cg_6', 'linda.davis@example.com', 'caregiver', NOW(), NOW()),
('77777777-7777-7777-7777-777777777777', 'firebase_cg_7', 'barbara.miller@example.com', 'caregiver', NOW(), NOW()),
('88888888-8888-8888-8888-888888888888', 'firebase_cg_8', 'susan.moore@example.com', 'caregiver', NOW(), NOW()),
('99999999-9999-9999-9999-999999999999', 'firebase_cg_9', 'nancy.taylor@example.com', 'caregiver', NOW(), NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'firebase_cg_10', 'karen.anderson@example.com', 'caregiver', NOW(), NOW()),
-- Care Seekers
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'firebase_cs_1', 'john.smith@example.com', 'patient', NOW(), NOW()),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'firebase_cs_2', 'robert.jones@example.com', 'patient', NOW(), NOW()),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'firebase_cs_3', 'michael.williams@example.com', 'patient', NOW(), NOW()),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'firebase_cs_4', 'david.martinez@example.com', 'patient', NOW(), NOW()),
('ffffffff-ffff-ffff-ffff-ffffffffffff', 'firebase_cs_5', 'james.thompson@example.com', 'patient', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert Caregiver Profiles with diverse data
INSERT INTO caregiver_profiles (
  user_id, first_name, last_name, phone, date_of_birth, 
  address, city, state, zip_code,
  languages, education_level, years_experience, 
  specializations, availability, hourly_rate,
  bio, emergency_contact_name, emergency_contact_phone,
  verification_status, background_check_status, assessment_score,
  profile_completed, created_at, updated_at
) VALUES
-- NYC Area (10001)
('11111111-1111-1111-1111-111111111111', 'Sarah', 'Johnson', '2125551001', '1985-03-15',
 '123 5th Avenue', 'New York', 'NY', '10001',
 ARRAY['English', 'Spanish'], 'Bachelor''s Degree', 8,
 ARRAY['Dementia Care', 'Alzheimer''s Care', 'Medication Management'],
 ARRAY['Weekday Mornings', 'Weekday Afternoons', 'Weekend Mornings'],
 35, 
 'Compassionate caregiver with 8 years experience specializing in dementia and Alzheimer''s care. Certified in CPR and first aid.',
 'Michael Johnson', '2125551002',
 'verified', 'clear', 92, true, NOW(), NOW()),

-- SF Area (94102)
('22222222-2222-2222-2222-222222222222', 'Maria', 'Garcia', '4155552001', '1990-07-22',
 '456 Market Street', 'San Francisco', 'CA', '94102',
 ARRAY['English', 'Spanish', 'Portuguese'], 'Associate Degree', 5,
 ARRAY['Mobility Assistance', 'Personal Care', 'Companionship'],
 ARRAY['Weekday Evenings', 'Weekend Afternoons', 'Overnight Care'],
 42,
 'Bilingual caregiver focused on providing dignified personal care and mobility support. Experience with post-surgery recovery.',
 'Carlos Garcia', '4155552002',
 'verified', 'clear', 88, true, NOW(), NOW()),

-- Chicago Area (60601)
('33333333-3333-3333-3333-333333333333', 'Jennifer', 'Chen', '3125553001', '1988-11-30',
 '789 Michigan Avenue', 'Chicago', 'IL', '60601',
 ARRAY['English', 'Mandarin'], 'Master''s Degree', 10,
 ARRAY['Parkinson''s Care', 'Physical Therapy Support', 'Diabetes Management'],
 ARRAY['Weekday Mornings', 'Weekday Afternoons', 'Flexible'],
 45,
 'Experienced RN with specialized training in Parkinson''s and diabetes management. Fluent in Mandarin and English.',
 'David Chen', '3125553002',
 'verified', 'clear', 95, true, NOW(), NOW()),

-- Beverly Hills (90210)
('44444444-4444-4444-4444-444444444444', 'Emily', 'Wilson', '3105554001', '1992-05-18',
 '321 Rodeo Drive', 'Beverly Hills', 'CA', '90210',
 ARRAY['English', 'French'], 'Bachelor''s Degree', 6,
 ARRAY['Companionship', 'Transportation', 'Light Housekeeping'],
 ARRAY['Weekday Afternoons', 'Weekend Mornings', 'Weekend Afternoons'],
 55,
 'Premium caregiver offering companionship and concierge-level care services. Background in hospitality and elder care.',
 'Susan Wilson', '3105554002',
 'verified', 'clear', 90, true, NOW(), NOW()),

-- Miami Beach (33139)
('55555555-5555-5555-5555-555555555555', 'Patricia', 'Brown', '3055555001', '1987-09-10',
 '654 Ocean Drive', 'Miami Beach', 'FL', '33139',
 ARRAY['English', 'Spanish', 'Hebrew'], 'Associate Degree', 7,
 ARRAY['Post-Surgery Care', 'Medication Management', 'Wound Care'],
 ARRAY['24/7 Live-in', 'Overnight Care'],
 38,
 'Specialized in post-operative care and wound management. Available for live-in positions.',
 'Robert Brown', '3055555002',
 'verified', 'clear', 87, true, NOW(), NOW()),

-- Boston Area (02108)
('66666666-6666-6666-6666-666666666666', 'Linda', 'Davis', '6175556001', '1983-12-25',
 '987 Beacon Street', 'Boston', 'MA', '02108',
 ARRAY['English', 'Italian'], 'Bachelor''s Degree', 12,
 ARRAY['Hospice Care', 'Cancer Support', 'Pain Management'],
 ARRAY['Weekday Mornings', 'Weekday Afternoons', 'Weekday Evenings'],
 48,
 'Compassionate hospice care specialist with extensive experience in end-of-life care and family support.',
 'Mark Davis', '6175556002',
 'verified', 'clear', 94, true, NOW(), NOW()),

-- Seattle (98101)
('77777777-7777-7777-7777-777777777777', 'Barbara', 'Miller', '2065557001', '1991-02-14',
 '111 Pike Street', 'Seattle', 'WA', '98101',
 ARRAY['English', 'Japanese'], 'Associate Degree', 4,
 ARRAY['Dementia Care', 'Companionship', 'Meal Preparation'],
 ARRAY['Weekend Mornings', 'Weekend Afternoons', 'Flexible'],
 32,
 'Patient and caring professional specializing in memory care. Certified in dementia care techniques.',
 'John Miller', '2065557002',
 'verified', 'clear', 85, true, NOW(), NOW()),

-- Austin (78701)
('88888888-8888-8888-8888-888888888888', 'Susan', 'Moore', '5125558001', '1989-06-08',
 '222 Congress Avenue', 'Austin', 'TX', '78701',
 ARRAY['English', 'Spanish'], 'Bachelor''s Degree', 9,
 ARRAY['Stroke Recovery', 'Physical Therapy Support', 'Speech Therapy Support'],
 ARRAY['Weekday Mornings', 'Weekday Afternoons'],
 40,
 'Specialized in stroke recovery and rehabilitation support. Work closely with PT/OT teams.',
 'William Moore', '5125558002',
 'verified', 'clear', 91, true, NOW(), NOW()),

-- Additional NYC (10001)
('99999999-9999-9999-9999-999999999999', 'Nancy', 'Taylor', '2125559001', '1986-04-20',
 '555 Broadway', 'New York', 'NY', '10001',
 ARRAY['English', 'Russian', 'Ukrainian'], 'Master''s Degree', 11,
 ARRAY['Alzheimer''s Care', 'Behavioral Management', 'Family Education'],
 ARRAY['Weekday Evenings', 'Overnight Care'],
 50,
 'Geriatric care manager with expertise in Alzheimer''s and family education. Fluent in Russian and Ukrainian.',
 'Peter Taylor', '2125559002',
 'verified', 'clear', 93, true, NOW(), NOW()),

-- Additional SF (94102)
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Karen', 'Anderson', '4155550001', '1984-08-12',
 '888 Mission Street', 'San Francisco', 'CA', '94102',
 ARRAY['English', 'Tagalog'], 'Bachelor''s Degree', 15,
 ARRAY['Heart Disease Care', 'Diabetes Management', 'Nutrition Support'],
 ARRAY['Weekday Mornings', 'Weekday Afternoons', 'Weekend Mornings'],
 52,
 'Cardiac care specialist with 15 years experience. Expertise in heart disease and diabetes management.',
 'James Anderson', '4155550002',
 'verified', 'clear', 96, true, NOW(), NOW())
ON CONFLICT (user_id) DO NOTHING;

-- Insert Patient/Care Seeker Profiles
INSERT INTO patient_profiles (
  user_id, first_name, last_name, phone,
  address_line1, city, state, zip,
  emergency_contact_name, emergency_contact_phone,
  medical_conditions, medications, care_needs,
  language_preference, subscription_status,
  created_at, updated_at
) VALUES
-- NYC Care Seeker
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'John', 'Smith', '2125551111',
 '789 Park Avenue', 'New York', 'NY', '10001',
 'Mary Smith', '2125551112',
 ARRAY['Diabetes', 'Hypertension'], 
 ARRAY['Metformin', 'Lisinopril'],
 ARRAY['Medication Management', 'Companionship', 'Light Housekeeping'],
 'English', 'active', NOW(), NOW()),

-- SF Care Seeker
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Robert', 'Jones', '4155552111',
 '999 Lombard Street', 'San Francisco', 'CA', '94102',
 'Linda Jones', '4155552112',
 ARRAY['Parkinson''s Disease'], 
 ARRAY['Carbidopa-Levodopa'],
 ARRAY['Mobility Assistance', 'Physical Therapy Support', 'Personal Care'],
 'English', 'active', NOW(), NOW()),

-- Chicago Care Seeker
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Michael', 'Williams', '3125553111',
 '456 Lake Shore Drive', 'Chicago', 'IL', '60601',
 'Sarah Williams', '3125553112',
 ARRAY['Alzheimer''s Disease', 'Arthritis'],
 ARRAY['Donepezil', 'Ibuprofen'],
 ARRAY['Memory Care', 'Personal Care', 'Meal Preparation'],
 'English', 'active', NOW(), NOW()),

-- Beverly Hills Care Seeker
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'David', 'Martinez', '3105554111',
 '123 Sunset Boulevard', 'Beverly Hills', 'CA', '90210',
 'Angela Martinez', '3105554112',
 ARRAY['Post-Surgery Recovery'],
 ARRAY['Pain medication as needed'],
 ARRAY['Post-Surgery Care', 'Mobility Assistance', 'Transportation'],
 'Spanish', 'active', NOW(), NOW()),

-- Miami Beach Care Seeker
('ffffffff-ffff-ffff-ffff-ffffffffffff', 'James', 'Thompson', '3055555111',
 '777 Collins Avenue', 'Miami Beach', 'FL', '33139',
 'Patricia Thompson', '3055555112',
 ARRAY['Heart Disease', 'COPD'],
 ARRAY['Atorvastatin', 'Albuterol'],
 ARRAY['Cardiac Care', 'Medication Management', 'Oxygen Therapy Support'],
 'English', 'active', NOW(), NOW())
ON CONFLICT (user_id) DO NOTHING;

-- Create some sample bookings to show activity
INSERT INTO bookings (
  id, patient_id, caregiver_id,
  service_date, start_time, end_time,
  service_type, care_needs, location_type,
  status, duration_hours, hourly_rate, total_cost,
  special_instructions, created_at, updated_at
) VALUES
-- Active booking
('b1111111-1111-1111-1111-111111111111', 
 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
 '11111111-1111-1111-1111-111111111111',
 CURRENT_DATE + INTERVAL '2 days', '09:00:00', '13:00:00',
 'recurring', ARRAY['Medication Management', 'Companionship'], 'at_home',
 'confirmed', 4, 35, 140,
 'Please arrive 10 minutes early. Door code will be provided.',
 NOW(), NOW()),

-- Pending booking
('b2222222-2222-2222-2222-222222222222',
 'cccccccc-cccc-cccc-cccc-cccccccccccc',
 '22222222-2222-2222-2222-222222222222',
 CURRENT_DATE + INTERVAL '5 days', '14:00:00', '18:00:00',
 'one_time', ARRAY['Physical Therapy Support'], 'at_home',
 'pending', 4, 42, 168,
 'PT exercises sheet on kitchen counter.',
 NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Add some sample reviews
INSERT INTO reviews (
  id, booking_id, reviewer_id, reviewee_id,
  rating, review_text, created_at
) VALUES
('r1111111-1111-1111-1111-111111111111',
 'b1111111-1111-1111-1111-111111111111',
 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
 '11111111-1111-1111-1111-111111111111',
 5, 'Sarah is wonderful! Very patient and caring with my father. Highly recommend.',
 NOW()),

('r2222222-2222-2222-2222-222222222222',
 'b2222222-2222-2222-2222-222222222222',
 'cccccccc-cccc-cccc-cccc-cccccccccccc',
 '22222222-2222-2222-2222-222222222222',
 4, 'Maria is very professional and helped greatly with mobility exercises.',
 NOW())
ON CONFLICT (id) DO NOTHING;

-- Sample messages between users
INSERT INTO messages (
  id, sender_id, receiver_id, booking_id,
  content, is_read, created_at
) VALUES
('m1111111-1111-1111-1111-111111111111',
 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
 '11111111-1111-1111-1111-111111111111',
 'b1111111-1111-1111-1111-111111111111',
 'Hi Sarah, looking forward to meeting you on Tuesday!',
 true, NOW()),

('m2222222-2222-2222-2222-222222222222',
 '11111111-1111-1111-1111-111111111111',
 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
 'b1111111-1111-1111-1111-111111111111',
 'Hello John! I''m excited to help. Is there anything specific I should know before our first session?',
 false, NOW())
ON CONFLICT (id) DO NOTHING;