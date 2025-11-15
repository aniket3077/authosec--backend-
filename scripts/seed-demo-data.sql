-- ============================================
-- DEMO DATA FOR AUTHOSEC 2FA SYSTEM
-- ============================================

-- Insert Demo Companies
INSERT INTO public.companies (
  id, name, email, phone, business_type, registration_id,
  subscription_tier, is_active, created_at, updated_at, firebase_org_id
) VALUES
  (
    'comp_demo_001',
    'TechCorp Solutions',
    'contact@techcorp.com',
    '+919876543210',
    'Technology',
    'REG-TECH-2024-001',
    'PREMIUM',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    'org_techcorp'
  ),
  (
    'comp_demo_002',
    'Retail Mart India',
    'info@retailmart.com',
    '+919876543211',
    'Retail',
    'REG-RETAIL-2024-002',
    'BASIC',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    'org_retailmart'
  ),
  (
    'comp_demo_003',
    'Finance Plus',
    'hello@financeplus.com',
    '+919876543212',
    'Finance',
    'REG-FIN-2024-003',
    'ENTERPRISE',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    'org_financeplus'
  );

-- Insert Demo Users (Firebase UIDs will be created separately)
INSERT INTO public.users (
  id, email, first_name, last_name, phone, role, company_id,
  is_active, created_at, updated_at, last_login, firebase_uid, department, position
) VALUES
  -- Company Admins
  (
    'user_admin_001',
    'admin@techcorp.com',
    'Rajesh',
    'Kumar',
    '+919876543210',
    'COMPANY_ADMIN',
    'comp_demo_001',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    'firebase_admin_001',
    'Management',
    'CEO'
  ),
  (
    'user_admin_002',
    'admin@retailmart.com',
    'Priya',
    'Sharma',
    '+919876543211',
    'COMPANY_ADMIN',
    'comp_demo_002',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    'firebase_admin_002',
    'Management',
    'Operations Head'
  ),
  
  -- Regular Users (Senders)
  (
    'user_sender_001',
    'sender1@techcorp.com',
    'Amit',
    'Patel',
    '+919876543220',
    'ACCOUNT_USER',
    'comp_demo_001',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    'firebase_sender_001',
    'Finance',
    'Account Manager'
  ),
  (
    'user_sender_002',
    'sender2@retailmart.com',
    'Sneha',
    'Reddy',
    '+919876543221',
    'ACCOUNT_USER',
    'comp_demo_002',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    'firebase_sender_002',
    'Procurement',
    'Purchase Officer'
  ),
  
  -- Regular Users (Receivers)
  (
    'user_receiver_001',
    'receiver1@techcorp.com',
    'Vikram',
    'Singh',
    '+919876543230',
    'ACCOUNT_USER',
    'comp_demo_001',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    'firebase_receiver_001',
    'Sales',
    'Sales Executive'
  ),
  (
    'user_receiver_002',
    'receiver2@financeplus.com',
    'Ananya',
    'Iyer',
    '+919876543231',
    'ACCOUNT_USER',
    'comp_demo_003',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    'firebase_receiver_002',
    'Operations',
    'Service Manager'
  ),
  (
    'user_receiver_003',
    'receiver3@retailmart.com',
    'Arjun',
    'Verma',
    '+919876543232',
    'ACCOUNT_USER',
    'comp_demo_002',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    'firebase_receiver_003',
    'Logistics',
    'Delivery Manager'
  );

-- Insert Demo Transactions (Various States)

-- Transaction 1: INITIATED (Ready for QR1 scan)
INSERT INTO public.transactions (
  id, transaction_number, sender_id, receiver_id, company_id, amount, currency,
  description, status, qr1_code, qr1_encrypted_data, qr1_generated_at, qr1_expires_at,
  initiated_at, expires_at, created_at, updated_at
) VALUES (
  'txn_demo_001',
  'TXN-2024-001',
  'user_sender_001',
  'user_receiver_001',
  'comp_demo_001',
  5000.00,
  'INR',
  'Payment for software license',
  'INITIATED',
  'QR1_ENCRYPTED_CODE_001',
  '{"encrypted":"data1","iv":"iv1"}',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP + INTERVAL '10 minutes',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP + INTERVAL '1 hour',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Transaction 2: QR1_SCANNED (Ready for QR2 generation)
INSERT INTO public.transactions (
  id, transaction_number, sender_id, receiver_id, company_id, amount, currency,
  description, status, qr1_code, qr1_encrypted_data, qr1_generated_at, qr1_expires_at,
  initiated_at, expires_at, created_at, updated_at
) VALUES (
  'txn_demo_002',
  'TXN-2024-002',
  'user_sender_002',
  'user_receiver_003',
  'comp_demo_002',
  12000.00,
  'INR',
  'Supplier payment - Electronics',
  'QR1_SCANNED',
  'QR1_ENCRYPTED_CODE_002',
  '{"encrypted":"data2","iv":"iv2"}',
  CURRENT_TIMESTAMP - INTERVAL '2 minutes',
  CURRENT_TIMESTAMP + INTERVAL '8 minutes',
  CURRENT_TIMESTAMP - INTERVAL '2 minutes',
  CURRENT_TIMESTAMP + INTERVAL '58 minutes',
  CURRENT_TIMESTAMP - INTERVAL '2 minutes',
  CURRENT_TIMESTAMP
);

-- Transaction 3: QR2_GENERATED (Ready for sender to scan QR2)
INSERT INTO public.transactions (
  id, transaction_number, sender_id, receiver_id, company_id, amount, currency,
  description, status, 
  qr1_code, qr1_encrypted_data, qr1_generated_at, qr1_expires_at,
  qr2_code, qr2_encrypted_data, qr2_generated_at, qr2_expires_at,
  initiated_at, expires_at, created_at, updated_at
) VALUES (
  'txn_demo_003',
  'TXN-2024-003',
  'user_sender_001',
  'user_receiver_002',
  'comp_demo_001',
  25000.00,
  'INR',
  'Consultancy fees Q4',
  'QR2_GENERATED',
  'QR1_ENCRYPTED_CODE_003',
  '{"encrypted":"data3","iv":"iv3"}',
  CURRENT_TIMESTAMP - INTERVAL '5 minutes',
  CURRENT_TIMESTAMP + INTERVAL '5 minutes',
  'QR2_ENCRYPTED_CODE_003',
  '{"encrypted":"data3_qr2","iv":"iv3_qr2"}',
  CURRENT_TIMESTAMP - INTERVAL '1 minute',
  CURRENT_TIMESTAMP + INTERVAL '9 minutes',
  CURRENT_TIMESTAMP - INTERVAL '5 minutes',
  CURRENT_TIMESTAMP + INTERVAL '55 minutes',
  CURRENT_TIMESTAMP - INTERVAL '5 minutes',
  CURRENT_TIMESTAMP
);

-- Transaction 4: OTP_SENT (Ready for OTP verification)
INSERT INTO public.transactions (
  id, transaction_number, sender_id, receiver_id, company_id, amount, currency,
  description, status,
  qr1_code, qr1_encrypted_data, qr1_generated_at, qr1_expires_at,
  qr2_code, qr2_encrypted_data, qr2_generated_at, qr2_expires_at,
  otp_hash, otp_sent_at, otp_attempts,
  initiated_at, expires_at, created_at, updated_at
) VALUES (
  'txn_demo_004',
  'TXN-2024-004',
  'user_sender_002',
  'user_receiver_001',
  'comp_demo_002',
  8500.00,
  'INR',
  'Vendor payment - Office supplies',
  'OTP_SENT',
  'QR1_ENCRYPTED_CODE_004',
  '{"encrypted":"data4","iv":"iv4"}',
  CURRENT_TIMESTAMP - INTERVAL '8 minutes',
  CURRENT_TIMESTAMP + INTERVAL '2 minutes',
  'QR2_ENCRYPTED_CODE_004',
  '{"encrypted":"data4_qr2","iv":"iv4_qr2"}',
  CURRENT_TIMESTAMP - INTERVAL '4 minutes',
  CURRENT_TIMESTAMP + INTERVAL '6 minutes',
  '$2b$10$abcdefghijklmnopqrstuv',
  CURRENT_TIMESTAMP - INTERVAL '30 seconds',
  0,
  CURRENT_TIMESTAMP - INTERVAL '8 minutes',
  CURRENT_TIMESTAMP + INTERVAL '52 minutes',
  CURRENT_TIMESTAMP - INTERVAL '8 minutes',
  CURRENT_TIMESTAMP
);

-- Transaction 5: OTP_VERIFIED (Ready for completion)
INSERT INTO public.transactions (
  id, transaction_number, sender_id, receiver_id, company_id, amount, currency,
  description, status,
  qr1_code, qr1_encrypted_data, qr1_generated_at, qr1_expires_at,
  qr2_code, qr2_encrypted_data, qr2_generated_at, qr2_expires_at,
  otp_hash, otp_sent_at, otp_verified_at, otp_attempts,
  initiated_at, expires_at, created_at, updated_at
) VALUES (
  'txn_demo_005',
  'TXN-2024-005',
  'user_sender_001',
  'user_receiver_003',
  'comp_demo_001',
  15000.00,
  'INR',
  'Marketing campaign payment',
  'OTP_VERIFIED',
  'QR1_ENCRYPTED_CODE_005',
  '{"encrypted":"data5","iv":"iv5"}',
  CURRENT_TIMESTAMP - INTERVAL '10 minutes',
  CURRENT_TIMESTAMP - INTERVAL '2 minutes',
  'QR2_ENCRYPTED_CODE_005',
  '{"encrypted":"data5_qr2","iv":"iv5_qr2"}',
  CURRENT_TIMESTAMP - INTERVAL '7 minutes',
  CURRENT_TIMESTAMP + INTERVAL '3 minutes',
  '$2b$10$abcdefghijklmnopqrstuv',
  CURRENT_TIMESTAMP - INTERVAL '3 minutes',
  CURRENT_TIMESTAMP - INTERVAL '10 seconds',
  1,
  CURRENT_TIMESTAMP - INTERVAL '10 minutes',
  CURRENT_TIMESTAMP + INTERVAL '50 minutes',
  CURRENT_TIMESTAMP - INTERVAL '10 minutes',
  CURRENT_TIMESTAMP
);

-- Transaction 6: COMPLETED
INSERT INTO public.transactions (
  id, transaction_number, sender_id, receiver_id, company_id, amount, currency,
  description, status,
  qr1_code, qr1_encrypted_data, qr1_generated_at, qr1_expires_at,
  qr2_code, qr2_encrypted_data, qr2_generated_at, qr2_expires_at,
  otp_hash, otp_sent_at, otp_verified_at, otp_attempts,
  completed_at, initiated_at, created_at, updated_at
) VALUES (
  'txn_demo_006',
  'TXN-2024-006',
  'user_sender_002',
  'user_receiver_002',
  'comp_demo_002',
  45000.00,
  'INR',
  'Quarterly services payment',
  'COMPLETED',
  'QR1_ENCRYPTED_CODE_006',
  '{"encrypted":"data6","iv":"iv6"}',
  CURRENT_TIMESTAMP - INTERVAL '1 day',
  CURRENT_TIMESTAMP - INTERVAL '23 hours 50 minutes',
  'QR2_ENCRYPTED_CODE_006',
  '{"encrypted":"data6_qr2","iv":"iv6_qr2"}',
  CURRENT_TIMESTAMP - INTERVAL '23 hours 55 minutes',
  CURRENT_TIMESTAMP - INTERVAL '23 hours 45 minutes',
  '$2b$10$abcdefghijklmnopqrstuv',
  CURRENT_TIMESTAMP - INTERVAL '23 hours 52 minutes',
  CURRENT_TIMESTAMP - INTERVAL '23 hours 51 minutes',
  1,
  CURRENT_TIMESTAMP - INTERVAL '23 hours 50 minutes',
  CURRENT_TIMESTAMP - INTERVAL '1 day',
  CURRENT_TIMESTAMP - INTERVAL '1 day',
  CURRENT_TIMESTAMP - INTERVAL '23 hours 50 minutes'
);

-- Insert Transaction Logs
INSERT INTO public.transaction_logs (id, transaction_id, action, status, created_at) VALUES
  ('log_001', 'txn_demo_001', 'TRANSACTION_INITIATED', 'INITIATED', CURRENT_TIMESTAMP),
  ('log_002', 'txn_demo_002', 'TRANSACTION_INITIATED', 'INITIATED', CURRENT_TIMESTAMP - INTERVAL '2 minutes'),
  ('log_003', 'txn_demo_002', 'QR1_SCANNED', 'QR1_SCANNED', CURRENT_TIMESTAMP),
  ('log_004', 'txn_demo_003', 'TRANSACTION_INITIATED', 'INITIATED', CURRENT_TIMESTAMP - INTERVAL '5 minutes'),
  ('log_005', 'txn_demo_003', 'QR1_SCANNED', 'QR1_SCANNED', CURRENT_TIMESTAMP - INTERVAL '3 minutes'),
  ('log_006', 'txn_demo_003', 'QR2_GENERATED', 'QR2_GENERATED', CURRENT_TIMESTAMP - INTERVAL '1 minute'),
  ('log_007', 'txn_demo_006', 'TRANSACTION_COMPLETED', 'COMPLETED', CURRENT_TIMESTAMP - INTERVAL '23 hours 50 minutes');

-- Insert Notifications
INSERT INTO public.notifications (
  id, user_id, company_id, title, message, type, priority, is_read, created_at
) VALUES
  (
    'notif_001',
    'user_sender_001',
    'comp_demo_001',
    'Transaction Initiated',
    'Your payment of ₹5,000 to Vikram Singh has been initiated',
    'TRANSACTION',
    'NORMAL',
    false,
    CURRENT_TIMESTAMP
  ),
  (
    'notif_002',
    'user_receiver_001',
    'comp_demo_001',
    'Payment Pending',
    'Amit Patel has initiated a payment of ₹5,000. Please scan QR1 to proceed',
    'TRANSACTION',
    'HIGH',
    false,
    CURRENT_TIMESTAMP
  ),
  (
    'notif_003',
    'user_sender_002',
    'comp_demo_002',
    'Transaction Completed',
    'Your payment of ₹45,000 has been successfully completed',
    'TRANSACTION',
    'NORMAL',
    true,
    CURRENT_TIMESTAMP - INTERVAL '23 hours 50 minutes'
  ),
  (
    'notif_004',
    'user_receiver_002',
    'comp_demo_003',
    'Payment Received',
    'You have received ₹45,000 from Sneha Reddy',
    'TRANSACTION',
    'NORMAL',
    true,
    CURRENT_TIMESTAMP - INTERVAL '23 hours 50 minutes'
  );

-- Insert OTP Logs
INSERT INTO public.otp_logs (
  id, user_id, phone_number, otp_hash, purpose, transaction_id,
  is_verified, verified_at, attempts, expires_at, created_at
) VALUES
  (
    'otp_001',
    'user_receiver_001',
    '+919876543230',
    '$2b$10$abcdefghijklmnopqrstuv',
    'TRANSACTION_VERIFICATION',
    'txn_demo_004',
    false,
    NULL,
    0,
    CURRENT_TIMESTAMP + INTERVAL '4 minutes 30 seconds',
    CURRENT_TIMESTAMP - INTERVAL '30 seconds'
  ),
  (
    'otp_002',
    'user_receiver_003',
    '+919876543232',
    '$2b$10$xyzabcdefghijklmnopqr',
    'TRANSACTION_VERIFICATION',
    'txn_demo_005',
    true,
    CURRENT_TIMESTAMP - INTERVAL '10 seconds',
    1,
    CURRENT_TIMESTAMP + INTERVAL '2 minutes 50 seconds',
    CURRENT_TIMESTAMP - INTERVAL '3 minutes'
  );

-- Verify data inserted
SELECT 'Companies' as entity, COUNT(*) as count FROM public.companies
UNION ALL
SELECT 'Users', COUNT(*) FROM public.users
UNION ALL
SELECT 'Transactions', COUNT(*) FROM public.transactions
UNION ALL
SELECT 'Transaction Logs', COUNT(*) FROM public.transaction_logs
UNION ALL
SELECT 'Notifications', COUNT(*) FROM public.notifications
UNION ALL
SELECT 'OTP Logs', COUNT(*) FROM public.otp_logs;

-- Display transaction statuses
SELECT 
  transaction_number,
  status,
  amount,
  description,
  CONCAT(s.first_name, ' ', s.last_name) as sender,
  CONCAT(r.first_name, ' ', r.last_name) as receiver
FROM public.transactions t
JOIN public.users s ON t.sender_id = s.id
JOIN public.users r ON t.receiver_id = r.id
ORDER BY t.created_at DESC;

SELECT '✅ Demo data seeded successfully!' as status;
