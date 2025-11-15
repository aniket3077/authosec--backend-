/**
 * Database Seed Script
 * Resets the database and seeds it with 3 companies and multiple users
 * Run with: npm run seed or npm run db:reset
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

/**
 * Reset database - clear all data in correct order (respecting foreign keys)
 */
async function resetDatabase() {
  console.log('🔄 Resetting database...\n');

  try {
    // Delete in order to respect foreign key constraints
    console.log('1️⃣  Deleting transaction logs...');
    await prisma.transaction_logs.deleteMany({});
    console.log('   ✅ Transaction logs deleted');

    console.log('2️⃣  Deleting OTP logs...');
    await prisma.otp_logs.deleteMany({});
    console.log('   ✅ OTP logs deleted');

    console.log('3️⃣  Deleting notifications...');
    await prisma.notifications.deleteMany({});
    console.log('   ✅ Notifications deleted');

    console.log('4️⃣  Deleting transactions...');
    await prisma.transactions.deleteMany({});
    console.log('   ✅ Transactions deleted');

    console.log('5️⃣  Deleting employee metrics...');
    await prisma.employee_metrics.deleteMany({});
    console.log('   ✅ Employee metrics deleted');

    console.log('6️⃣  Deleting project tasks...');
    await prisma.project_tasks.deleteMany({});
    console.log('   ✅ Project tasks deleted');

    console.log('7️⃣  Deleting projects...');
    await prisma.projects.deleteMany({});
    console.log('   ✅ Projects deleted');

    console.log('8️⃣  Deleting role assignments...');
    await prisma.role_assignments.deleteMany({});
    console.log('   ✅ Role assignments deleted');

    console.log('9️⃣  Deleting custom roles...');
    await prisma.custom_roles.deleteMany({});
    console.log('   ✅ Custom roles deleted');

    console.log('🔟 Deleting approvals...');
    await prisma.approvals.deleteMany({});
    console.log('   ✅ Approvals deleted');

    console.log('1️⃣1️⃣ Deleting merchants...');
    await prisma.merchants.deleteMany({});
    console.log('   ✅ Merchants deleted');

    console.log('1️⃣2️⃣ Deleting audit logs...');
    await prisma.audit_logs.deleteMany({});
    console.log('   ✅ Audit logs deleted');

    console.log('1️⃣3️⃣ Deleting QR scan logs...');
    await prisma.qr_scan_logs.deleteMany({});
    console.log('   ✅ QR scan logs deleted');

    console.log('1️⃣4️⃣ Deleting users...');
    await prisma.users.deleteMany({});
    console.log('   ✅ Users deleted');

    console.log('1️⃣5️⃣ Deleting companies...');
    await prisma.companies.deleteMany({});
    console.log('   ✅ Companies deleted\n');

    console.log('✅ Database reset complete!\n');
  } catch (error: any) {
    console.error('❌ Error resetting database:', error.message);
    throw error;
  }
}

/**
 * Create companies with different business types and subscription tiers
 */
async function createCompanies() {
  console.log('🏢 Creating companies...\n');

  const companies = [
    {
      id: uuidv4(),
      name: 'TechCorp Solutions',
      email: 'contact@techcorp.com',
      phone: '+911234567890',
      business_type: 'IT Services',
      registration_id: 'TECH-REG-2024-001',
      subscription_tier: 'PREMIUM' as const,
      address: '123 Tech Park, Bangalore, Karnataka, India',
      is_active: true,
    },
    {
      id: uuidv4(),
      name: 'RetailMart Ltd',
      email: 'info@retailmart.com',
      phone: '+911234567891',
      business_type: 'Retail',
      registration_id: 'RETAIL-REG-2024-002',
      subscription_tier: 'BASIC' as const,
      address: '456 Shopping Mall, Mumbai, Maharashtra, India',
      is_active: true,
    },
    {
      id: uuidv4(),
      name: 'Manufacturing Inc',
      email: 'contact@manufacturing.com',
      phone: '+911234567892',
      business_type: 'Manufacturing',
      registration_id: 'MFG-REG-2024-003',
      subscription_tier: 'ENTERPRISE' as const,
      address: '789 Industrial Area, Chennai, Tamil Nadu, India',
      is_active: true,
    },
  ];

  const createdCompanies = [];
  
  for (const companyData of companies) {
    const company = await prisma.companies.create({
      data: {
        ...companyData,
        updated_at: new Date(),
      },
    });
    createdCompanies.push(company);
    console.log(`   ✅ Created company: ${company.name} (${company.subscription_tier})`);
  }

  console.log('');
  return createdCompanies;
}

/**
 * Create users for each company
 */
async function createUsers(companies: any[]) {
  console.log('👥 Creating users...\n');

  const userData = [
    // TechCorp Solutions - Company 1
    [
      {
        email: 'admin@techcorp.com',
        phone: '+919876543210',
        firstName: 'Rajesh',
        lastName: 'Kumar',
        role: 'COMPANY_ADMIN' as const,
        department: 'Management',
        position: 'CEO',
      },
      {
        email: 'user1@techcorp.com',
        phone: '+919876543211',
        firstName: 'Priya',
        lastName: 'Sharma',
        role: 'ACCOUNT_USER' as const,
        department: 'Development',
        position: 'Senior Developer',
      },
      {
        email: 'user2@techcorp.com',
        phone: '+919876543212',
        firstName: 'Amit',
        lastName: 'Patel',
        role: 'ACCOUNT_USER' as const,
        department: 'Development',
        position: 'Junior Developer',
      },
      {
        email: 'user3@techcorp.com',
        phone: '+919876543213',
        firstName: 'Sneha',
        lastName: 'Reddy',
        role: 'ACCOUNT_USER' as const,
        department: 'QA',
        position: 'QA Engineer',
      },
    ],
    // RetailMart Ltd - Company 2
    [
      {
        email: 'admin@retailmart.com',
        phone: '+919876543220',
        firstName: 'Vikram',
        lastName: 'Singh',
        role: 'COMPANY_ADMIN' as const,
        department: 'Management',
        position: 'Store Manager',
      },
      {
        email: 'user1@retailmart.com',
        phone: '+919876543221',
        firstName: 'Meera',
        lastName: 'Joshi',
        role: 'ACCOUNT_USER' as const,
        department: 'Sales',
        position: 'Sales Associate',
      },
      {
        email: 'user2@retailmart.com',
        phone: '+919876543222',
        firstName: 'Rahul',
        lastName: 'Verma',
        role: 'ACCOUNT_USER' as const,
        department: 'Inventory',
        position: 'Inventory Manager',
      },
      {
        email: 'user3@retailmart.com',
        phone: '+919876543223',
        firstName: 'Anjali',
        lastName: 'Gupta',
        role: 'ACCOUNT_USER' as const,
        department: 'Customer Service',
        position: 'Customer Service Representative',
      },
    ],
    // Manufacturing Inc - Company 3
    [
      {
        email: 'admin@manufacturing.com',
        phone: '+919876543230',
        firstName: 'Suresh',
        lastName: 'Iyer',
        role: 'COMPANY_ADMIN' as const,
        department: 'Management',
        position: 'Plant Manager',
      },
      {
        email: 'user1@manufacturing.com',
        phone: '+919876543231',
        firstName: 'Deepak',
        lastName: 'Nair',
        role: 'ACCOUNT_USER' as const,
        department: 'Production',
        position: 'Production Supervisor',
      },
      {
        email: 'user2@manufacturing.com',
        phone: '+919876543232',
        firstName: 'Kavita',
        lastName: 'Menon',
        role: 'ACCOUNT_USER' as const,
        department: 'Quality Control',
        position: 'QC Inspector',
      },
      {
        email: 'user3@manufacturing.com',
        phone: '+919876543233',
        firstName: 'Mohan',
        lastName: 'Krishnan',
        role: 'ACCOUNT_USER' as const,
        department: 'Logistics',
        position: 'Logistics Coordinator',
      },
    ],
  ];

  const createdUsers = [];

  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];
    const users = userData[i];

    console.log(`   Creating users for ${company.name}...`);

    for (const userInfo of users) {
      const user = await prisma.users.create({
        data: {
          id: uuidv4(),
          email: userInfo.email,
          phone: userInfo.phone,
          first_name: userInfo.firstName,
          last_name: userInfo.lastName,
          role: userInfo.role,
          company_id: company.id,
          department: userInfo.department,
          position: userInfo.position,
          is_active: true,
          last_login: new Date(),
          updated_at: new Date(),
        },
      });

      createdUsers.push(user);
      const roleLabel = userInfo.role === 'COMPANY_ADMIN' ? 'Admin' : 'User';
      console.log(`      ✅ Created ${roleLabel}: ${userInfo.firstName} ${userInfo.lastName} (${userInfo.email})`);
    }

    console.log('');
  }

  return createdUsers;
}

/**
 * Main seed function
 */
async function seed() {
  console.log('🌱 Starting database seed...\n');
  console.log('================================\n');

  try {
    // Step 1: Reset database
    await resetDatabase();

    // Step 2: Create companies
    const companies = await createCompanies();

    // Step 3: Create users
    const users = await createUsers(companies);

    // Summary
    console.log('================================\n');
    console.log('✅ Database seed completed successfully! 🎉\n');
    console.log('📊 Summary:');
    console.log(`   • Companies created: ${companies.length}`);
    console.log(`   • Users created: ${users.length}`);
    console.log(`   • Admins: ${users.filter(u => u.role === 'COMPANY_ADMIN').length}`);
    console.log(`   • Regular users: ${users.filter(u => u.role === 'ACCOUNT_USER').length}\n`);
    
    console.log('📝 Company Details:');
    companies.forEach((company, index) => {
      const companyUsers = users.filter(u => u.company_id === company.id);
      console.log(`   ${index + 1}. ${company.name}`);
      console.log(`      - Subscription: ${company.subscription_tier}`);
      console.log(`      - Business Type: ${company.business_type}`);
      console.log(`      - Users: ${companyUsers.length} (1 admin, ${companyUsers.length - 1} employees)`);
    });

    console.log('\n✨ You can now use the seeded data for testing!');

  } catch (error: any) {
    console.error('\n❌ Seed failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  seed();
}

export { seed, resetDatabase };

