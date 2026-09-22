-- =============================================================================
-- Healthcare demo seed — Alpha Trading LLC (UI tenant slug: alpha)
-- Tenant UUID: 00000000-0000-0000-0000-000000000101
-- Idempotent: deletes prior rows with seed id prefix a101%%%% then re-inserts.
-- Apply: npm run db:seed:healthcare
-- =============================================================================

begin;

-- Resolve tenant (Alpha Trading LLC — user shorthand "Alfah Trading")
do $$
declare
  v_tenant uuid := '00000000-0000-0000-0000-000000000101';
  v_name text;
begin
  select name into v_name from public.tenants where id = v_tenant;
  if v_name is null then
    raise exception 'Tenant Alpha Trading LLC (%) not found', v_tenant;
  end if;
  raise notice 'Seeding healthcare for tenant: % (%)', v_name, v_tenant;
end $$;

-- Wipe previous healthcare seed rows (fixed UUID namespace a101*)
do $$
declare
  v_tenant uuid := '00000000-0000-0000-0000-000000000101';
  t text;
begin
  foreach t in array array[
    'hms_messages','hms_message_threads','hms_notifications','hms_notification_prefs',
    'hms_reminder_queue','hms_doctor_leave','hms_appointment_waitlist',
    'hms_branch_share_consents','hms_pharmacy_po_items','hms_pharmacy_purchase_orders',
    'hms_emr_attachments','hms_lab_results','hms_dispenses','hms_mar','hms_vitals',
    'hms_transfers','hms_payments','hms_break_glass','hms_phi_audit_logs',
    'hms_insurance_claims','hms_telemedicine_sessions','hms_ambulance_dispatches',
    'hms_emergency_intakes','hms_duty_rosters','hms_equipment_assets','hms_staff',
    'hms_imaging_orders','hms_lab_orders','hms_prescriptions','hms_pharmacy_stock',
    'hms_admissions','hms_beds','hms_wards','hms_branches',
    'hms_clinical_notes','hms_problem_list','hms_allergy_list','hms_medication_list',
    'hms_patient_consents','hms_invoices','hms_encounters','hms_appointments',
    'hms_role_assignments','hms_patients'
  ]
  loop
    execute format(
      'delete from public.%I where tenant_id = %L and id::text like %L',
      t, v_tenant, 'a101%'
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Core IDs (Alpha Trading)
-- ---------------------------------------------------------------------------
-- tenant  = 00000000-0000-0000-0000-000000000101
-- patients a1010000-0000-4000-8000-000000000001..005
-- branch   a1010000-0000-4000-8000-000000000101..102
-- ward     ...201..203  beds ...301..306
-- staff    ...401..404
-- etc.

insert into public.hms_branches (id, tenant_id, code, name, address, phone, is_active) values
  ('a1010000-0000-4000-8000-000000000101', '00000000-0000-0000-0000-000000000101', 'MAIN', 'Alpha Main Hospital', 'Business Bay, Dubai', '+971 55 100 1100', true),
  ('a1010000-0000-4000-8000-000000000102', '00000000-0000-0000-0000-000000000101', 'NORTH', 'Alpha North Clinic', 'Deira, Dubai', '+971 55 100 1200', true);

insert into public.hms_patients (
  id, tenant_id, mrn, full_name, dob, gender, phone, email, national_id, address,
  blood_group, emergency_contact_name, emergency_contact_phone,
  insurance_payer, insurance_policy_no, insurance_group_no, guardian_patient_id,
  status, anonymized, created_by, is_active
) values
  ('a1010000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000101', 'MRN-ALPHA-0001', 'Fatima Al Hashimi', '1988-03-12', 'female', '+971501000001', 'fatima.hashimi@example.com', '784-1988-1234567-1', 'Jumeirah, Dubai', 'O+', 'Ali Al Hashimi', '+971501000011', 'Daman', 'DAM-99821', 'GRP-A1', null, 'active', false, 'seed', true),
  ('a1010000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000101', 'MRN-ALPHA-0002', 'Omar Rahman', '1975-07-21', 'male', '+971501000002', 'omar.rahman@example.com', '784-1975-7654321-2', 'Al Quoz, Dubai', 'A+', 'Sara Rahman', '+971501000012', 'AXA', 'AXA-44102', 'GRP-B2', null, 'active', false, 'seed', true),
  ('a1010000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000101', 'MRN-ALPHA-0003', 'Noor Khalid', '2016-11-05', 'female', '+971501000003', null, null, 'Mirdif, Dubai', 'B+', 'Layla Khalid', '+971501000013', 'Daman', 'DAM-11220', 'GRP-A1', 'a1010000-0000-4000-8000-000000000001', 'active', false, 'seed', true),
  ('a1010000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000101', 'MRN-ALPHA-0004', 'Hassan Qureshi', '1992-01-30', 'male', '+971501000004', 'hassan.q@example.com', '784-1992-5551212-3', 'Sharjah', 'AB+', 'Amna Qureshi', '+971501000014', 'Orient', 'ORI-77801', 'GRP-C3', null, 'active', false, 'seed', true),
  ('a1010000-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000101', 'MRN-ALPHA-0005', 'Maryam Saeed', '1968-09-18', 'female', '+971501000005', 'maryam.s@example.com', '784-1968-9090909-4', 'Abu Dhabi', 'O-', 'Yusuf Saeed', '+971501000015', 'Daman', 'DAM-33001', 'GRP-A1', null, 'active', false, 'seed', true);

insert into public.hms_patient_consents (
  id, tenant_id, patient_id, consent_type, version, effective_date, document_ref, signed_by, created_by, is_active
) values
  ('a1010000-0000-4000-8000-000000000011', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000001', 'treatment', '1.0', current_date - 30, 'DOC-CONSENT-001', 'Fatima Al Hashimi', 'seed', true),
  ('a1010000-0000-4000-8000-000000000012', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000001', 'data_sharing', '1.0', current_date - 30, 'DOC-CONSENT-002', 'Fatima Al Hashimi', 'seed', true),
  ('a1010000-0000-4000-8000-000000000013', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000002', 'treatment', '1.0', current_date - 10, 'DOC-CONSENT-003', 'Omar Rahman', 'seed', true);

insert into public.hms_role_assignments (
  id, tenant_id, staff_email, staff_name, hms_role, branch_id, mfa_required, is_active, created_by
) values
  ('a1010000-0000-4000-8000-000000000021', '00000000-0000-0000-0000-000000000101', 'admin@demo.com', 'Ayesha Khan', 'hospital_admin', 'MAIN', true, true, 'seed'),
  ('a1010000-0000-4000-8000-000000000022', '00000000-0000-0000-0000-000000000101', 'manager@demo.com', 'Omar Farooq', 'doctor', 'MAIN', true, true, 'seed'),
  ('a1010000-0000-4000-8000-000000000023', '00000000-0000-0000-0000-000000000101', 'hr@demo.com', 'Sana Malik', 'nurse', 'MAIN', true, true, 'seed');

insert into public.hms_appointments (
  id, tenant_id, patient_id, patient_name, doctor_name, department, scheduled_at, status, notes, created_by, is_active
) values
  ('a1010000-0000-4000-8000-000000000031', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000001', 'Fatima Al Hashimi', 'Dr. Omar Farooq', 'General Medicine', now() + interval '1 day', 'scheduled', 'Follow-up BP', 'seed', true),
  ('a1010000-0000-4000-8000-000000000032', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000002', 'Omar Rahman', 'Dr. Nadia Rizvi', 'Cardiology', now() + interval '2 days', 'scheduled', 'Chest pain review', 'seed', true),
  ('a1010000-0000-4000-8000-000000000033', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000004', 'Hassan Qureshi', 'Dr. Omar Farooq', 'Orthopedics', now() - interval '1 day', 'completed', 'Knee pain', 'seed', true);

insert into public.hms_encounters (
  id, tenant_id, encounter_no, encounter_type, patient_id, patient_name, doctor_name, department,
  token_no, queue_status, visit_date, chief_complaint, appointment_id, status, created_by, is_active
) values
  ('a1010000-0000-4000-8000-000000000041', '00000000-0000-0000-0000-000000000101', 'ENC-OPD-0001', 'opd', 'a1010000-0000-4000-8000-000000000001', 'Fatima Al Hashimi', 'Dr. Omar Farooq', 'General Medicine', 'T-12', 'in_consult', current_date, 'Headache and fatigue', 'a1010000-0000-4000-8000-000000000031', 'open', 'seed', true),
  ('a1010000-0000-4000-8000-000000000042', '00000000-0000-0000-0000-000000000101', 'ENC-IPD-0001', 'ipd', 'a1010000-0000-4000-8000-000000000005', 'Maryam Saeed', 'Dr. Nadia Rizvi', 'Internal Medicine', null, 'completed', current_date - 2, 'Pneumonia', null, 'closed', 'seed', true),
  ('a1010000-0000-4000-8000-000000000043', '00000000-0000-0000-0000-000000000101', 'ENC-ER-0001', 'emergency', 'a1010000-0000-4000-8000-000000000004', 'Hassan Qureshi', 'Dr. Omar Farooq', 'Emergency', 'E-03', 'completed', current_date - 1, 'Ankle sprain', null, 'closed', 'seed', true);

insert into public.hms_clinical_notes (
  id, tenant_id, patient_id, encounter_id, patient_name, author_name, note_type,
  subjective, objective, assessment, plan, free_text, version_no, is_current, created_by, is_active
) values
  ('a1010000-0000-4000-8000-000000000051', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000001', 'a1010000-0000-4000-8000-000000000041', 'Fatima Al Hashimi', 'Dr. Omar Farooq', 'soap',
   'Reports headache x 3 days', 'BP 138/88, afebrile', 'Tension headache; HTN borderline', 'Rest, hydration, follow-up BP', null, 1, true, 'seed', true),
  ('a1010000-0000-4000-8000-000000000052', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000005', 'a1010000-0000-4000-8000-000000000042', 'Maryam Saeed', 'Dr. Nadia Rizvi', 'soap',
   'Cough and fever', 'SpO2 94%, crackles RLL', 'Community acquired pneumonia', 'IV antibiotics, oxygen PRN', null, 1, true, 'seed', true);

insert into public.hms_problem_list (id, tenant_id, patient_id, problem, icd10_code, status, onset_date, created_by, is_active) values
  ('a1010000-0000-4000-8000-000000000061', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000001', 'Essential hypertension', 'I10', 'active', '2022-01-01', 'seed', true),
  ('a1010000-0000-4000-8000-000000000062', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000005', 'Pneumonia, unspecified', 'J18.9', 'active', current_date - 2, 'seed', true);

insert into public.hms_allergy_list (id, tenant_id, patient_id, allergen, reaction, severity, status, created_by, is_active) values
  ('a1010000-0000-4000-8000-000000000071', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000001', 'Penicillin', 'Rash', 'moderate', 'active', 'seed', true),
  ('a1010000-0000-4000-8000-000000000072', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000002', 'NSAID', 'Gastric upset', 'mild', 'active', 'seed', true);

insert into public.hms_medication_list (id, tenant_id, patient_id, drug_name, dose, frequency, route, status, started_at, created_by, is_active) values
  ('a1010000-0000-4000-8000-000000000081', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000001', 'Amlodipine', '5 mg', 'OD', 'oral', 'current', '2023-06-01', 'seed', true),
  ('a1010000-0000-4000-8000-000000000082', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000005', 'Ceftriaxone', '1 g', 'BID', 'IV', 'current', current_date - 2, 'seed', true);

insert into public.hms_invoices (
  id, tenant_id, invoice_no, patient_id, patient_name, encounter_id, invoice_date, status,
  subtotal, tax_amount, discount_amount, total_amount, paid_amount, lines, tax_rate, notes, created_by, is_active
) values
  ('a1010000-0000-4000-8000-000000000091', '00000000-0000-0000-0000-000000000101', 'INV-HMS-0001', 'a1010000-0000-4000-8000-000000000001', 'Fatima Al Hashimi', 'a1010000-0000-4000-8000-000000000041', current_date, 'issued',
   250, 12.5, 0, 262.5, 0, '[{"item":"OPD consultation","qty":1,"amount":250}]'::jsonb, 5, 'OPD visit', 'seed', true),
  ('a1010000-0000-4000-8000-000000000092', '00000000-0000-0000-0000-000000000101', 'INV-HMS-0002', 'a1010000-0000-4000-8000-000000000005', 'Maryam Saeed', 'a1010000-0000-4000-8000-000000000042', current_date - 1, 'partially_paid',
   3200, 160, 100, 3260, 1000, '[{"item":"IPD room day","qty":2,"amount":2000},{"item":"Labs","qty":1,"amount":1200}]'::jsonb, 5, 'IPD stay', 'seed', true);

insert into public.hms_payments (
  id, tenant_id, payment_no, invoice_id, patient_name, amount, method, payment_date, created_by, is_active
) values
  ('a1010000-0000-4000-8000-000000000093', '00000000-0000-0000-0000-000000000101', 'PAY-HMS-0001', 'a1010000-0000-4000-8000-000000000092', 'Maryam Saeed', 1000, 'card', current_date - 1, 'seed', true);

insert into public.hms_wards (id, tenant_id, branch_id, code, name, ward_type, is_active) values
  ('a1010000-0000-4000-8000-000000000201', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000101', 'G-1', 'General Ward A', 'general', true),
  ('a1010000-0000-4000-8000-000000000202', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000101', 'ICU-1', 'Medical ICU', 'icu', true),
  ('a1010000-0000-4000-8000-000000000203', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000101', 'PVT-1', 'Private Wing', 'private', true);

insert into public.hms_beds (id, tenant_id, ward_id, bed_no, status, housekeeping_status, is_active) values
  ('a1010000-0000-4000-8000-000000000301', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000201', 'G1-01', 'occupied', 'clean', true),
  ('a1010000-0000-4000-8000-000000000302', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000201', 'G1-02', 'available', 'clean', true),
  ('a1010000-0000-4000-8000-000000000303', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000202', 'ICU-01', 'occupied', 'clean', true),
  ('a1010000-0000-4000-8000-000000000304', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000202', 'ICU-02', 'available', 'dirty', true),
  ('a1010000-0000-4000-8000-000000000305', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000203', 'P-01', 'available', 'clean', true),
  ('a1010000-0000-4000-8000-000000000306', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000203', 'P-02', 'housekeeping', 'in_progress', true);

insert into public.hms_admissions (
  id, tenant_id, admission_no, patient_id, patient_name, encounter_id, ward_id, bed_id,
  admitted_at, admission_type, attending_doctor, status, discharge_summary, discharged_at, mortality, created_by, is_active
) values
  ('a1010000-0000-4000-8000-000000000311', '00000000-0000-0000-0000-000000000101', 'ADM-0001', 'a1010000-0000-4000-8000-000000000005', 'Maryam Saeed', 'a1010000-0000-4000-8000-000000000042',
   'a1010000-0000-4000-8000-000000000202', 'a1010000-0000-4000-8000-000000000303',
   now() - interval '2 days', 'emergency', 'Dr. Nadia Rizvi', 'admitted', null, null, false, 'seed', true),
  ('a1010000-0000-4000-8000-000000000312', '00000000-0000-0000-0000-000000000101', 'ADM-0002', 'a1010000-0000-4000-8000-000000000002', 'Omar Rahman', null,
   'a1010000-0000-4000-8000-000000000201', 'a1010000-0000-4000-8000-000000000301',
   now() - interval '5 days', 'elective', 'Dr. Omar Farooq', 'discharged', 'Stable discharge after observation.', now() - interval '1 day', false, 'seed', true);

insert into public.hms_transfers (
  id, tenant_id, admission_id, from_ward_id, to_ward_id, from_bed_id, to_bed_id, reason, transferred_at, created_by
) values
  ('a1010000-0000-4000-8000-000000000321', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000311',
   'a1010000-0000-4000-8000-000000000201', 'a1010000-0000-4000-8000-000000000202',
   'a1010000-0000-4000-8000-000000000301', 'a1010000-0000-4000-8000-000000000303',
   'Required closer monitoring', now() - interval '1 day', 'seed');

insert into public.hms_vitals (
  id, tenant_id, patient_id, admission_id, encounter_id, recorded_at, bp_systolic, bp_diastolic, pulse, temperature_c, spo2, weight_kg, recorded_by, is_active
) values
  ('a1010000-0000-4000-8000-000000000331', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000005', 'a1010000-0000-4000-8000-000000000311', 'a1010000-0000-4000-8000-000000000042',
   now() - interval '3 hours', 128, 82, 92, 37.8, 94, 68.5, 'Nurse Sana', true),
  ('a1010000-0000-4000-8000-000000000332', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000001', null, 'a1010000-0000-4000-8000-000000000041',
   now() - interval '1 hour', 138, 88, 78, 36.7, 98, 72.0, 'Nurse Sana', true);

insert into public.hms_mar (
  id, tenant_id, admission_id, patient_id, drug_name, dose, route, scheduled_at, status, given_at, given_by, is_active
) values
  ('a1010000-0000-4000-8000-000000000341', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000311', 'a1010000-0000-4000-8000-000000000005',
   'Ceftriaxone', '1 g', 'IV', now() - interval '2 hours', 'given', now() - interval '2 hours', 'Nurse Sana', true),
  ('a1010000-0000-4000-8000-000000000342', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000311', 'a1010000-0000-4000-8000-000000000005',
   'Paracetamol', '1 g', 'IV', now() + interval '2 hours', 'scheduled', null, null, true);

insert into public.hms_prescriptions (
  id, tenant_id, rx_no, patient_id, patient_name, encounter_id, prescriber_name, status, route_to, allergy_checked, issued_at, items, created_by, is_active
) values
  ('a1010000-0000-4000-8000-000000000351', '00000000-0000-0000-0000-000000000101', 'RX-0001', 'a1010000-0000-4000-8000-000000000001', 'Fatima Al Hashimi', 'a1010000-0000-4000-8000-000000000041',
   'Dr. Omar Farooq', 'issued', 'hospital_pharmacy', true, now() - interval '30 minutes',
   '[{"drug_name":"Amlodipine","dose":"5 mg","frequency":"OD","route":"oral","days":30}]'::jsonb, 'seed', true),
  ('a1010000-0000-4000-8000-000000000352', '00000000-0000-0000-0000-000000000101', 'RX-0002', 'a1010000-0000-4000-8000-000000000004', 'Hassan Qureshi', 'a1010000-0000-4000-8000-000000000043',
   'Dr. Omar Farooq', 'issued', 'print', true, now() - interval '1 day',
   '[{"drug_name":"Ibuprofen","dose":"400 mg","frequency":"TID","route":"oral","days":5}]'::jsonb, 'seed', true);

insert into public.hms_pharmacy_stock (
  id, tenant_id, sku, drug_name, batch_no, expiry_date, quantity, reorder_level, unit_cost, supplier_name, is_active
) values
  ('a1010000-0000-4000-8000-000000000361', '00000000-0000-0000-0000-000000000101', 'SKU-AML-5', 'Amlodipine 5mg', 'B-AML-01', current_date + 400, 120, 20, 0.40, 'MedSupply UAE', true),
  ('a1010000-0000-4000-8000-000000000362', '00000000-0000-0000-0000-000000000101', 'SKU-CEF-1G', 'Ceftriaxone 1g', 'B-CEF-09', current_date + 200, 45, 15, 3.50, 'Gulf Pharma', true),
  ('a1010000-0000-4000-8000-000000000363', '00000000-0000-0000-0000-000000000101', 'SKU-PCM-1G', 'Paracetamol 1g IV', 'B-PCM-02', current_date + 30, 8, 10, 1.20, 'Gulf Pharma', true);

insert into public.hms_dispenses (
  id, tenant_id, dispense_no, prescription_id, patient_name, stock_id, drug_name, quantity, dispensed_at, dispensed_by, is_active
) values
  ('a1010000-0000-4000-8000-000000000371', '00000000-0000-0000-0000-000000000101', 'DSP-0001', 'a1010000-0000-4000-8000-000000000351', 'Fatima Al Hashimi',
   'a1010000-0000-4000-8000-000000000361', 'Amlodipine 5mg', 30, now() - interval '20 minutes', 'Pharmacist Ali', true);

insert into public.hms_lab_orders (
  id, tenant_id, order_no, patient_id, patient_name, encounter_id, ordering_physician, sample_barcode, tests, status, critical_alerted, barcode_printed_at, collected_at, created_by, is_active
) values
  ('a1010000-0000-4000-8000-000000000381', '00000000-0000-0000-0000-000000000101', 'LAB-0001', 'a1010000-0000-4000-8000-000000000005', 'Maryam Saeed', 'a1010000-0000-4000-8000-000000000042',
   'Dr. Nadia Rizvi', 'BC-LAB-0001', '["CBC","CRP","Blood culture"]'::jsonb, 'resulted', false, now() - interval '2 days', now() - interval '2 days', 'seed', true),
  ('a1010000-0000-4000-8000-000000000382', '00000000-0000-0000-0000-000000000101', 'LAB-0002', 'a1010000-0000-4000-8000-000000000001', 'Fatima Al Hashimi', 'a1010000-0000-4000-8000-000000000041',
   'Dr. Omar Farooq', 'BC-LAB-0002', '["Lipid panel","HbA1c"]'::jsonb, 'ordered', false, null, null, 'seed', true);

insert into public.hms_lab_results (
  id, tenant_id, lab_order_id, test_name, result_value, unit, reference_range, flag, resulted_at, resulted_by
) values
  ('a1010000-0000-4000-8000-000000000391', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000381', 'WBC', '14.2', '10^9/L', '4-11', 'high', now() - interval '1 day', 'Lab Tech Zain'),
  ('a1010000-0000-4000-8000-000000000392', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000381', 'CRP', '48', 'mg/L', '<5', 'critical', now() - interval '1 day', 'Lab Tech Zain');

insert into public.hms_imaging_orders (
  id, tenant_id, order_no, patient_id, patient_name, encounter_id, modality, body_part, clinical_indication,
  status, dicom_ref, pacs_viewer_url, report_text, radiologist_name, signed_at, created_by, is_active
) values
  ('a1010000-0000-4000-8000-000000000401', '00000000-0000-0000-0000-000000000101', 'IMG-0001', 'a1010000-0000-4000-8000-000000000005', 'Maryam Saeed', 'a1010000-0000-4000-8000-000000000042',
   'xray', 'Chest', 'Suspected pneumonia', 'signed_off', 'DICOM-ALPHA-001', 'https://example.com/pacs/view/DICOM-ALPHA-001',
   'Right lower lobe infiltrate consistent with pneumonia.', 'Dr. Radiologist Khan', now() - interval '1 day', 'seed', true),
  ('a1010000-0000-4000-8000-000000000402', '00000000-0000-0000-0000-000000000101', 'IMG-0002', 'a1010000-0000-4000-8000-000000000004', 'Hassan Qureshi', 'a1010000-0000-4000-8000-000000000043',
   'xray', 'Ankle', 'Trauma', 'reported', 'DICOM-ALPHA-002', null, 'No fracture identified.', 'Dr. Radiologist Khan', null, 'seed', true);

insert into public.hms_insurance_claims (
  id, tenant_id, claim_no, patient_id, patient_name, invoice_id, payer, policy_no, eligibility_status, claim_status, amount, created_by, is_active
) values
  ('a1010000-0000-4000-8000-000000000411', '00000000-0000-0000-0000-000000000101', 'CLM-0001', 'a1010000-0000-4000-8000-000000000005', 'Maryam Saeed',
   'a1010000-0000-4000-8000-000000000092', 'Daman', 'DAM-33001', 'eligible', 'submitted', 3260, 'seed', true),
  ('a1010000-0000-4000-8000-000000000412', '00000000-0000-0000-0000-000000000101', 'CLM-0002', 'a1010000-0000-4000-8000-000000000001', 'Fatima Al Hashimi',
   'a1010000-0000-4000-8000-000000000091', 'Daman', 'DAM-99821', 'eligible', 'draft', 262.5, 'seed', true);

insert into public.hms_telemedicine_sessions (
  id, tenant_id, session_no, patient_id, patient_name, doctor_name, scheduled_at, status, video_provider, join_token, notes, is_active
) values
  ('a1010000-0000-4000-8000-000000000421', '00000000-0000-0000-0000-000000000101', 'TM-0001', 'a1010000-0000-4000-8000-000000000001', 'Fatima Al Hashimi',
   'Dr. Omar Farooq', now() + interval '3 days', 'scheduled', 'baa_compliant_stub', 'tok-demo-001', 'BP follow-up video visit', true);

insert into public.hms_ambulance_dispatches (
  id, tenant_id, dispatch_no, patient_name, pickup_location, destination, status, gps_lat, gps_lng, vehicle_id, dispatched_at, is_active
) values
  ('a1010000-0000-4000-8000-000000000431', '00000000-0000-0000-0000-000000000101', 'AMB-0001', 'Hassan Qureshi', 'Al Nahda park', 'Alpha Main Hospital ED', 'completed', 25.276987, 55.296249, 'AMB-DXB-01', now() - interval '2 days', true);

insert into public.hms_emergency_intakes (
  id, tenant_id, intake_no, patient_id, patient_name, triage_priority, chief_complaint, incomplete_registration, encounter_id, created_by, is_active
) values
  ('a1010000-0000-4000-8000-000000000441', '00000000-0000-0000-0000-000000000101', 'ER-0001', 'a1010000-0000-4000-8000-000000000004', 'Hassan Qureshi',
   'urgent', 'Ankle injury after fall', false, 'a1010000-0000-4000-8000-000000000043', 'seed', true);

insert into public.hms_staff (id, tenant_id, staff_no, full_name, email, role_title, license_no, license_expiry, department, status, is_active) values
  ('a1010000-0000-4000-8000-000000000451', '00000000-0000-0000-0000-000000000101', 'STF-001', 'Dr. Omar Farooq', 'manager@demo.com', 'Consultant Physician', 'DHA-77881', current_date + 365, 'General Medicine', 'active', true),
  ('a1010000-0000-4000-8000-000000000452', '00000000-0000-0000-0000-000000000101', 'STF-002', 'Dr. Nadia Rizvi', 'nadia.rizvi@alpha.example', 'Cardiologist', 'DHA-88992', current_date + 200, 'Cardiology', 'active', true),
  ('a1010000-0000-4000-8000-000000000453', '00000000-0000-0000-0000-000000000101', 'STF-003', 'Nurse Sana Malik', 'hr@demo.com', 'Charge Nurse', 'MOH-22110', current_date + 500, 'Nursing', 'active', true),
  ('a1010000-0000-4000-8000-000000000454', '00000000-0000-0000-0000-000000000101', 'STF-004', 'Pharmacist Ali', 'ali.rx@alpha.example', 'Pharmacist', 'MOH-33440', current_date + 300, 'Pharmacy', 'active', true);

insert into public.hms_duty_rosters (id, tenant_id, staff_id, staff_name, shift_date, shift_type, ward_name, status, is_active) values
  ('a1010000-0000-4000-8000-000000000461', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000453', 'Nurse Sana Malik', current_date, 'day', 'Medical ICU', 'scheduled', true),
  ('a1010000-0000-4000-8000-000000000462', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000451', 'Dr. Omar Farooq', current_date, 'day', 'OPD', 'scheduled', true),
  ('a1010000-0000-4000-8000-000000000463', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000453', 'Nurse Sana Malik', current_date + 1, 'night', 'General Ward A', 'scheduled', true);

insert into public.hms_equipment_assets (
  id, tenant_id, asset_tag, name, category, location, status, next_maintenance, is_active
) values
  ('a1010000-0000-4000-8000-000000000471', '00000000-0000-0000-0000-000000000101', 'EQ-VENT-01', 'ICU Ventilator A', 'respiratory', 'Medical ICU', 'operational', current_date + 45, true),
  ('a1010000-0000-4000-8000-000000000472', '00000000-0000-0000-0000-000000000101', 'EQ-XRAY-01', 'Portable X-Ray', 'imaging', 'Radiology', 'operational', current_date + 90, true);

insert into public.hms_notification_prefs (id, tenant_id, patient_id, email_enabled, sms_enabled, push_enabled) values
  ('a1010000-0000-4000-8000-000000000481', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000001', true, false, true),
  ('a1010000-0000-4000-8000-000000000482', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000002', true, false, true);

insert into public.hms_notifications (id, tenant_id, recipient_ref, channel, title, body_generic, kind, read_at, created_at) values
  ('a1010000-0000-4000-8000-000000000491', '00000000-0000-0000-0000-000000000101', 'manager@demo.com', 'in_app', 'Critical lab result', 'A lab result requires your review.', 'critical_lab', null, now() - interval '1 day'),
  ('a1010000-0000-4000-8000-000000000492', '00000000-0000-0000-0000-000000000101', 'admin@demo.com', 'in_app', 'New message', 'You have a new secure message.', 'general', null, now() - interval '2 hours');

insert into public.hms_message_threads (id, tenant_id, subject, participant_emails, created_at, is_active) values
  ('a1010000-0000-4000-8000-000000000501', '00000000-0000-0000-0000-000000000101', 'Care coordination', array['admin@demo.com','manager@demo.com'], now() - interval '1 day', true);

insert into public.hms_messages (id, tenant_id, thread_id, sender_email, body, created_at) values
  ('a1010000-0000-4000-8000-000000000511', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000501', 'admin@demo.com', 'Please review ICU occupancy for tonight.', now() - interval '1 day'),
  ('a1010000-0000-4000-8000-000000000512', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000501', 'manager@demo.com', 'Acknowledged — will update roster.', now() - interval '20 hours');

insert into public.hms_pharmacy_purchase_orders (
  id, tenant_id, po_no, supplier_name, status, ordered_at, notes, created_by, is_active
) values
  ('a1010000-0000-4000-8000-000000000521', '00000000-0000-0000-0000-000000000101', 'PO-RX-0001', 'Gulf Pharma', 'ordered', now() - interval '3 days', 'Weekly replenishment', 'seed', true);

insert into public.hms_pharmacy_po_items (id, tenant_id, po_id, drug_name, quantity, unit_cost, is_active) values
  ('a1010000-0000-4000-8000-000000000522', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000521', 'Paracetamol 1g IV', 50, 1.20, true),
  ('a1010000-0000-4000-8000-000000000523', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000521', 'Ceftriaxone 1g', 30, 3.50, true);

insert into public.hms_branch_share_consents (
  id, tenant_id, patient_id, from_branch_id, to_branch_id, consent_version, granted_at, granted_by, is_active
) values
  ('a1010000-0000-4000-8000-000000000531', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000001',
   'a1010000-0000-4000-8000-000000000101', 'a1010000-0000-4000-8000-000000000102', '1.0', now() - interval '7 days', 'admin@demo.com', true);

insert into public.hms_appointment_waitlist (
  id, tenant_id, patient_id, patient_name, doctor_name, department, preferred_date, priority, status, is_active
) values
  ('a1010000-0000-4000-8000-000000000541', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000003', 'Noor Khalid',
   'Dr. Omar Farooq', 'Pediatrics', current_date + 5, 3, 'waiting', true);

insert into public.hms_doctor_leave (
  id, tenant_id, doctor_name, staff_id, starts_at, ends_at, reason, is_active
) values
  ('a1010000-0000-4000-8000-000000000551', '00000000-0000-0000-0000-000000000101', 'Dr. Nadia Rizvi',
   'a1010000-0000-4000-8000-000000000452', now() + interval '10 days', now() + interval '12 days', 'Conference leave', true);

insert into public.hms_reminder_queue (
  id, tenant_id, channel, template_key, recipient_email, payload_generic, scheduled_at, status
) values
  ('a1010000-0000-4000-8000-000000000561', '00000000-0000-0000-0000-000000000101', 'email', 'appointment_reminder',
   'fatima.hashimi@example.com', '{"kind":"appointment_reminder"}'::jsonb, now() + interval '20 hours', 'pending');

insert into public.hms_emr_attachments (
  id, tenant_id, patient_id, encounter_id, clinical_note_id, file_name, storage_path, content_type, file_size, uploaded_by, is_active
) values
  ('a1010000-0000-4000-8000-000000000571', '00000000-0000-0000-0000-000000000101', 'a1010000-0000-4000-8000-000000000005',
   'a1010000-0000-4000-8000-000000000042', 'a1010000-0000-4000-8000-000000000052',
   'referral-scan.pdf', 'tenants/00000000-0000-0000-0000-000000000101/seed/referral-scan.pdf', 'application/pdf', 24576, 'seed', true);

insert into public.hms_phi_audit_logs (
  id, tenant_id, actor_email, action, table_name, record_id, after_diff, break_glass
) values
  ('a1010000-0000-4000-8000-000000000581', '00000000-0000-0000-0000-000000000101', 'seed@system', 'seed', 'hms_patients', 'a1010000-0000-4000-8000-000000000001',
   '{"mrn":"MRN-ALPHA-0001"}'::jsonb, false);

insert into public.hms_break_glass (
  id, tenant_id, actor_email, patient_id, patient_mrn, justification, alerted_security_officer, expires_at
) values
  ('a1010000-0000-4000-8000-000000000591', '00000000-0000-0000-0000-000000000101', 'admin@demo.com',
   'a1010000-0000-4000-8000-000000000005', 'MRN-ALPHA-0005', 'Emergency chart review for ICU transfer coordination', true, now() + interval '1 hour');

-- Catalog masters still used by leftover catalog tabs (doctors, lab tests, etc.)
delete from public.catalog_records
 where tenant_id = '00000000-0000-0000-0000-000000000101'
   and id::text like 'a101%';

insert into public.catalog_records (id, tenant_id, slug, status, payload, is_active) values
  ('a1010000-0000-4000-8000-000000000601', '00000000-0000-0000-0000-000000000101', 'healthcare.doctors', 'active',
   '{"code":"DR-001","full_name":"Dr. Omar Farooq","specialty":"General Medicine","pmc_no":"DHA-77881","phone":"+971551001002","fee":250}'::jsonb, true),
  ('a1010000-0000-4000-8000-000000000602', '00000000-0000-0000-0000-000000000101', 'healthcare.doctors', 'active',
   '{"code":"DR-002","full_name":"Dr. Nadia Rizvi","specialty":"Cardiology","pmc_no":"DHA-88992","phone":"+971551001003","fee":400}'::jsonb, true),
  ('a1010000-0000-4000-8000-000000000603', '00000000-0000-0000-0000-000000000101', 'healthcare.lab_tests', 'active',
   '{"code":"LT-CBC","name":"Complete Blood Count","specimen":"Blood","tat_hours":4}'::jsonb, true),
  ('a1010000-0000-4000-8000-000000000604', '00000000-0000-0000-0000-000000000101', 'healthcare.lab_tests', 'active',
   '{"code":"LT-CRP","name":"C-Reactive Protein","specimen":"Blood","tat_hours":2}'::jsonb, true),
  ('a1010000-0000-4000-8000-000000000605', '00000000-0000-0000-0000-000000000101', 'healthcare.diagnoses', 'active',
   '{"code":"I10","name":"Essential hypertension","icd10":"I10"}'::jsonb, true),
  ('a1010000-0000-4000-8000-000000000606', '00000000-0000-0000-0000-000000000101', 'healthcare.diagnoses', 'active',
   '{"code":"J18.9","name":"Pneumonia unspecified","icd10":"J18.9"}'::jsonb, true),
  ('a1010000-0000-4000-8000-000000000607', '00000000-0000-0000-0000-000000000101', 'healthcare.ot', 'active',
   '{"case_no":"OT-001","patient_name":"Omar Rahman","procedure":"Knee arthroscopy","status":"scheduled"}'::jsonb, true),
  ('a1010000-0000-4000-8000-000000000608', '00000000-0000-0000-0000-000000000101', 'healthcare.treatment_plans', 'active',
   '{"plan_no":"TP-001","patient_name":"Fatima Al Hashimi","goal":"BP control","status":"active"}'::jsonb, true),
  ('a1010000-0000-4000-8000-000000000609', '00000000-0000-0000-0000-000000000101', 'healthcare.consents', 'active',
   '{"patient_name":"Fatima Al Hashimi","consent_type":"treatment","version":"1.0"}'::jsonb, true),
  ('a1010000-0000-4000-8000-000000000610', '00000000-0000-0000-0000-000000000101', 'healthcare.insurance', 'active',
   '{"payer":"Daman","policy_no":"DAM-99821","patient_name":"Fatima Al Hashimi","status":"active"}'::jsonb, true),
  ('a1010000-0000-4000-8000-000000000611', '00000000-0000-0000-0000-000000000101', 'healthcare.infection', 'active',
   '{"case_no":"IC-001","organism":"None detected","ward":"ICU","status":"closed"}'::jsonb, true),
  ('a1010000-0000-4000-8000-000000000612', '00000000-0000-0000-0000-000000000101', 'healthcare.quality', 'active',
   '{"indicator":"Hand hygiene compliance","period":"2026-09","value":"94%","status":"on_track"}'::jsonb, true),
  ('a1010000-0000-4000-8000-000000000613', '00000000-0000-0000-0000-000000000101', 'healthcare.cssd', 'active',
   '{"load_no":"CSSD-001","items":"Surgical trays","cycle":"steam","status":"passed"}'::jsonb, true),
  ('a1010000-0000-4000-8000-000000000614', '00000000-0000-0000-0000-000000000101', 'healthcare.phc_audit', 'active',
   '{"checklist":"PHC monthly","score":88,"auditor":"Quality lead","status":"completed"}'::jsonb, true);

commit;
