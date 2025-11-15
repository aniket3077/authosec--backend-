-- Verify demo data was inserted correctly

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

-- Show transactions with details
SELECT 
  t.transaction_number,
  t.status::text as status,
  t.amount,
  t.description,
  CONCAT(s.first_name, ' ', s.last_name) as sender,
  CONCAT(r.first_name, ' ', r.last_name) as receiver,
  c.name as company
FROM public.transactions t
JOIN public.users s ON t.sender_id = s.id
JOIN public.users r ON t.receiver_id = r.id
LEFT JOIN public.companies c ON t.company_id = c.id
ORDER BY t.created_at DESC;
