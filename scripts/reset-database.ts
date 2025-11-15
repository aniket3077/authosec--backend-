/**
 * Database Reset Script
 * Removes ALL data from the database, including users, companies, and all related records
 * Run with: npm run db:clear
 * 
 * WARNING: This will permanently delete all data in the database!
 */

import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

/**
 * Get record counts for each table
 */
async function getRecordCounts() {
  try {
    const counts = {
      transaction_logs: await prisma.transaction_logs.count(),
      otp_logs: await prisma.otp_logs.count(),
      notifications: await prisma.notifications.count(),
      transactions: await prisma.transactions.count(),
      employee_metrics: await prisma.employee_metrics.count(),
      project_tasks: await prisma.project_tasks.count(),
      projects: await prisma.projects.count(),
      role_assignments: await prisma.role_assignments.count(),
      custom_roles: await prisma.custom_roles.count(),
      approvals: await prisma.approvals.count(),
      merchants: await prisma.merchants.count(),
      audit_logs: await prisma.audit_logs.count(),
      qr_scan_logs: await prisma.qr_scan_logs.count(),
      users: await prisma.users.count(),
      companies: await prisma.companies.count(),
    };

    return counts;
  } catch (error: any) {
    console.error('Error getting record counts:', error.message);
    throw error;
  }
}

/**
 * Prompt user for confirmation
 */
function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Reset database - clear all data in correct order (respecting foreign keys)
 */
async function resetDatabase() {
  console.log('🔄 Resetting database...\n');

  try {
    // Delete in order to respect foreign key constraints
    console.log('1️⃣  Deleting transaction logs...');
    const transactionLogsCount = await prisma.transaction_logs.deleteMany({});
    console.log(`   ✅ Deleted ${transactionLogsCount.count} transaction log(s)`);

    console.log('2️⃣  Deleting OTP logs...');
    const otpLogsCount = await prisma.otp_logs.deleteMany({});
    console.log(`   ✅ Deleted ${otpLogsCount.count} OTP log(s)`);

    console.log('3️⃣  Deleting notifications...');
    const notificationsCount = await prisma.notifications.deleteMany({});
    console.log(`   ✅ Deleted ${notificationsCount.count} notification(s)`);

    console.log('4️⃣  Deleting transactions...');
    const transactionsCount = await prisma.transactions.deleteMany({});
    console.log(`   ✅ Deleted ${transactionsCount.count} transaction(s)`);

    console.log('5️⃣  Deleting employee metrics...');
    const employeeMetricsCount = await prisma.employee_metrics.deleteMany({});
    console.log(`   ✅ Deleted ${employeeMetricsCount.count} employee metric(s)`);

    console.log('6️⃣  Deleting project tasks...');
    const projectTasksCount = await prisma.project_tasks.deleteMany({});
    console.log(`   ✅ Deleted ${projectTasksCount.count} project task(s)`);

    console.log('7️⃣  Deleting projects...');
    const projectsCount = await prisma.projects.deleteMany({});
    console.log(`   ✅ Deleted ${projectsCount.count} project(s)`);

    console.log('8️⃣  Deleting role assignments...');
    const roleAssignmentsCount = await prisma.role_assignments.deleteMany({});
    console.log(`   ✅ Deleted ${roleAssignmentsCount.count} role assignment(s)`);

    console.log('9️⃣  Deleting custom roles...');
    const customRolesCount = await prisma.custom_roles.deleteMany({});
    console.log(`   ✅ Deleted ${customRolesCount.count} custom role(s)`);

    console.log('🔟 Deleting approvals...');
    const approvalsCount = await prisma.approvals.deleteMany({});
    console.log(`   ✅ Deleted ${approvalsCount.count} approval(s)`);

    console.log('1️⃣1️⃣ Deleting merchants...');
    const merchantsCount = await prisma.merchants.deleteMany({});
    console.log(`   ✅ Deleted ${merchantsCount.count} merchant(s)`);

    console.log('1️⃣2️⃣ Deleting audit logs...');
    const auditLogsCount = await prisma.audit_logs.deleteMany({});
    console.log(`   ✅ Deleted ${auditLogsCount.count} audit log(s)`);

    console.log('1️⃣3️⃣ Deleting QR scan logs...');
    const qrScanLogsCount = await prisma.qr_scan_logs.deleteMany({});
    console.log(`   ✅ Deleted ${qrScanLogsCount.count} QR scan log(s)`);

    console.log('1️⃣4️⃣ Deleting users...');
    const usersCount = await prisma.users.deleteMany({});
    console.log(`   ✅ Deleted ${usersCount.count} user(s) (including all admins)`);

    console.log('1️⃣5️⃣ Deleting companies...');
    const companiesCount = await prisma.companies.deleteMany({});
    console.log(`   ✅ Deleted ${companiesCount.count} companie(s)\n`);

    console.log('✅ Database reset complete! All data has been removed.\n');
  } catch (error: any) {
    console.error('❌ Error resetting database:', error.message);
    throw error;
  }
}

/**
 * Main reset function with confirmation
 */
async function main() {
  console.log('⚠️  WARNING: DATABASE RESET SCRIPT ⚠️');
  console.log('=====================================\n');
  console.log('This script will PERMANENTLY DELETE ALL DATA from the database:');
  console.log('  • All users (including admins)');
  console.log('  • All companies');
  console.log('  • All transactions');
  console.log('  • All related records\n');

  try {
    // Get current record counts
    console.log('📊 Current database records:\n');
    const counts = await getRecordCounts();
    
    console.log(`   • Companies: ${counts.companies}`);
    console.log(`   • Users: ${counts.users}`);
    console.log(`   • Transactions: ${counts.transactions}`);
    console.log(`   • Notifications: ${counts.notifications}`);
    console.log(`   • Projects: ${counts.projects}`);
    console.log(`   • Approvals: ${counts.approvals}`);
    console.log(`   • Merchants: ${counts.merchants}`);
    console.log(`   • OTP Logs: ${counts.otp_logs}`);
    console.log(`   • Transaction Logs: ${counts.transaction_logs}`);
    console.log(`   • Employee Metrics: ${counts.employee_metrics}`);
    console.log(`   • Project Tasks: ${counts.project_tasks}`);
    console.log(`   • Role Assignments: ${counts.role_assignments}`);
    console.log(`   • Custom Roles: ${counts.custom_roles}`);
    console.log(`   • Audit Logs: ${counts.audit_logs}`);
    console.log(`   • QR Scan Logs: ${counts.qr_scan_logs}\n`);

    const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);
    
    if (totalRecords === 0) {
      console.log('ℹ️  Database is already empty. No data to delete.\n');
      await prisma.$disconnect();
      process.exit(0);
    }

    // Check for --force flag to skip confirmation
    const forceFlag = process.argv.includes('--force') || process.argv.includes('-f');
    
    if (!forceFlag) {
      console.log('⚠️  This action CANNOT be undone!\n');
      const confirmed = await askConfirmation('Are you sure you want to delete ALL data? (type "yes" to confirm): ');
      
      if (!confirmed) {
        console.log('\n❌ Operation cancelled. Database unchanged.\n');
        await prisma.$disconnect();
        process.exit(0);
      }
    } else {
      console.log('⚠️  Force flag detected. Skipping confirmation...\n');
    }

    // Perform reset
    await resetDatabase();

    // Verify deletion
    console.log('🔍 Verifying deletion...\n');
    const verifyCounts = await getRecordCounts();
    const remainingRecords = Object.values(verifyCounts).reduce((sum, count) => sum + count, 0);
    
    if (remainingRecords === 0) {
      console.log('✅ Verification complete: All data has been successfully deleted.\n');
    } else {
      console.warn('⚠️  Warning: Some records may still exist. Please check manually.\n');
    }

  } catch (error: any) {
    console.error('\n❌ Reset failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

export { resetDatabase, getRecordCounts };

