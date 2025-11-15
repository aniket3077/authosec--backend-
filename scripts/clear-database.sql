-- ============================================
-- CLEAR ALL DATA FROM DATABASE
-- WARNING: This will delete ALL data!
-- ============================================

-- Disable foreign key constraints temporarily
SET session_replication_role = 'replica';

-- Clear all tables (in order to respect foreign key dependencies)
TRUNCATE TABLE 
  public.transaction_logs,
  public.qr_scan_logs,
  public.otp_logs,
  public.transactions,
  public.role_assignments,
  public.project_tasks,
  public.projects,
  public.notifications,
  public.merchants,
  public.employee_metrics,
  public.audit_logs,
  public.approvals,
  public.custom_roles,
  public.users,
  public.companies
CASCADE;

-- Re-enable foreign key constraints
SET session_replication_role = 'origin';

-- Verify tables are empty
SELECT 
  'users' as table_name, COUNT(*) as count FROM public.users
UNION ALL
SELECT 'companies', COUNT(*) FROM public.companies
UNION ALL
SELECT 'transactions', COUNT(*) FROM public.transactions
UNION ALL
SELECT 'notifications', COUNT(*) FROM public.notifications
UNION ALL
SELECT 'otp_logs', COUNT(*) FROM public.otp_logs;

SELECT '✅ Database cleared successfully!' as status;
