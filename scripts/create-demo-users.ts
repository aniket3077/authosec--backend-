/**
 * Create Demo Users Script
 * 
 * This script will:
 * 1. Delete all existing Firebase users
 * 2. Clear all database data
 * 3. Create 3 companies with demo users
 * 4. Create Firebase users for each demo user with default password
 * 
 * Run with: npm run db:demo
 * 
 * WARNING: This will permanently delete all Firebase users and database data!
 */

import { PrismaClient, TransactionStatus } from '@prisma/client';
import { auth } from '../src/lib/firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { nanoid } from 'nanoid';
import * as readline from 'readline';
import QRService from '../src/lib/qr';
import { EncryptionService } from '../src/lib/encryption';

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = 'Demo@123'; // Default password for all demo users

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
 * List all Firebase users and return count
 */
async function listFirebaseUsers() {
  try {
    let allUsers: any[] = [];
    let nextPageToken: string | undefined;

    do {
      const listUsersResult = await auth.listUsers(1000, nextPageToken);
      allUsers = allUsers.concat(listUsersResult.users);
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);

    return allUsers;
  } catch (error: any) {
    console.error('Error listing Firebase users:', error.message);
    throw error;
  }
}

/**
 * Delete all Firebase users
 */
async function deleteAllFirebaseUsers() {
  console.log('🔥 Deleting all Firebase users...\n');

  try {
    const users = await listFirebaseUsers();
    
    if (users.length === 0) {
      console.log('   ℹ️  No Firebase users found. Database is empty.\n');
      return;
    }

    console.log(`   Found ${users.length} Firebase user(s) to delete\n`);

    // Delete users in batches (Firebase allows 1000 at a time)
    const batchSize = 1000;
    let deletedCount = 0;

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      const uids = batch.map(user => user.uid);
      
      try {
        await auth.deleteUsers(uids);
        deletedCount += batch.length;
        console.log(`   ✅ Deleted ${deletedCount}/${users.length} user(s)`);
      } catch (error: any) {
        console.error(`   ❌ Error deleting batch: ${error.message}`);
        // Try deleting individually if batch fails
        for (const uid of uids) {
          try {
            await auth.deleteUser(uid);
            deletedCount++;
            console.log(`   ✅ Deleted user ${deletedCount}/${users.length}`);
          } catch (err: any) {
            console.error(`   ❌ Failed to delete user ${uid}: ${err.message}`);
          }
        }
      }
    }

    console.log(`\n   ✅ Successfully deleted ${deletedCount} Firebase user(s)\n`);
  } catch (error: any) {
    console.error('❌ Error deleting Firebase users:', error.message);
    throw error;
  }
}

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
 * Create Firebase user
 */
async function createFirebaseUser(email: string, password: string, displayName: string, phoneNumber?: string) {
  try {
    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
      phoneNumber: phoneNumber?.startsWith('+') ? phoneNumber : undefined,
      emailVerified: true,
    });
    return userRecord;
  } catch (error: any) {
    console.error(`   ❌ Failed to create Firebase user ${email}: ${error.message}`);
    throw error;
  }
}

/**
 * Create users for each company with Firebase accounts
 */
async function createUsersWithFirebase(companies: any[]) {
  console.log('👥 Creating users with Firebase accounts...\n');

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
      try {
        // Create Firebase user first
        const displayName = `${userInfo.firstName} ${userInfo.lastName}`;
        const firebaseUser = await createFirebaseUser(
          userInfo.email,
          DEFAULT_PASSWORD,
          displayName,
          userInfo.phone
        );

        // Create database user with Firebase UID
        const user = await prisma.users.create({
          data: {
            id: uuidv4(),
            firebase_uid: firebaseUser.uid,
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
        console.log(`         Password: ${DEFAULT_PASSWORD}`);
      } catch (error: any) {
        console.error(`      ❌ Failed to create user ${userInfo.email}: ${error.message}`);
        // Continue with next user even if one fails
      }
    }

    console.log('');
  }

  return createdUsers;
}

/**
 * Create demo transactions between users
 */
async function createDemoTransactions(users: any[]) {
  console.log('💳 Creating demo transactions...\n');

  const transactions = [];
  const now = new Date();
  
  // Group users by company
  const usersByCompany = users.reduce((acc: any, user: any) => {
    if (!acc[user.company_id]) {
      acc[user.company_id] = [];
    }
    acc[user.company_id].push(user);
    return acc;
  }, {});

  const companies = Object.keys(usersByCompany);
  
  // Create transactions with different statuses
  let transactionCount = 0;

  for (let i = 0; i < companies.length; i++) {
    const companyUsers = usersByCompany[companies[i]];
    const adminUser = companyUsers.find((u: any) => u.role === 'COMPANY_ADMIN');
    const regularUsers = companyUsers.filter((u: any) => u.role === 'ACCOUNT_USER');

    if (!adminUser || regularUsers.length === 0) continue;

    console.log(`   Creating transactions for company users...`);

    // Create 2 completed transactions
    for (let j = 0; j < Math.min(2, regularUsers.length); j++) {
      try {
        const sender = adminUser;
        const receiver = regularUsers[j];
        const amount = (Math.random() * 10000 + 1000).toFixed(2);
        const transactionNumber = `TXN${nanoid(10).toUpperCase()}`;
        
        // Generate encryption key and IV
        const encryptionKey = EncryptionService.generateKey();
        const iv = EncryptionService.generateIV();

        // Create completed transaction
        const initiatedAt = new Date(now.getTime() - (24 - transactionCount * 2) * 60 * 60 * 1000);
        const qr1GeneratedAt = new Date(initiatedAt.getTime() + 1 * 60 * 1000);
        const qr1ExpiresAt = new Date(qr1GeneratedAt.getTime() + 15 * 60 * 1000);
        const qr2GeneratedAt = new Date(qr1GeneratedAt.getTime() + 2 * 60 * 1000);
        const qr2ExpiresAt = new Date(qr2GeneratedAt.getTime() + 10 * 60 * 1000);
        const otpSentAt = new Date(qr2GeneratedAt.getTime() + 1 * 60 * 1000);
        const otpVerifiedAt = new Date(otpSentAt.getTime() + 30 * 1000);
        const completedAt = new Date(otpVerifiedAt.getTime() + 1 * 60 * 1000);

        // Generate QR1
        const qr1Data = {
          transactionId: uuidv4(),
          type: 'qr1' as const,
          amount: Number(amount),
          senderId: sender.id,
          receiverId: receiver.id,
          timestamp: qr1GeneratedAt.getTime(),
          expiresAt: qr1ExpiresAt.getTime(),
          nonce: nanoid(16),
        };

        const { qrCodeImage: qr1Image, encryptedData: qr1Encrypted } = await QRService.generateQR(
          qr1Data,
          encryptionKey,
          iv
        );

        // Generate QR2
        const qr2Data = {
          transactionId: uuidv4(),
          type: 'qr2' as const,
          amount: Number(amount),
          senderId: sender.id,
          receiverId: receiver.id,
          timestamp: qr2GeneratedAt.getTime(),
          expiresAt: qr2ExpiresAt.getTime(),
          nonce: nanoid(16),
        };

        const { qrCodeImage: qr2Image, encryptedData: qr2Encrypted } = await QRService.generateQR(
          qr2Data,
          encryptionKey,
          iv
        );

        // Create OTP hash
        const otp = '123456'; // Demo OTP
        const otpHash = EncryptionService.hash(otp);

        const transaction = await prisma.transactions.create({
          data: {
            id: uuidv4(),
            transaction_number: transactionNumber,
            sender_id: sender.id,
            company_id: sender.company_id,
            receiver_id: receiver.id,
            amount: amount,
            currency: 'INR',
            description: `Demo payment for ${receiver.first_name} ${receiver.last_name}`,
            status: TransactionStatus.COMPLETED,
            qr1_code: qr1Image,
            qr1_encrypted_data: qr1Encrypted,
            qr1_generated_at: qr1GeneratedAt,
            qr1_expires_at: qr1ExpiresAt,
            qr2_code: qr2Image,
            qr2_encrypted_data: qr2Encrypted,
            qr2_generated_at: qr2GeneratedAt,
            qr2_expires_at: qr2ExpiresAt,
            otp_hash: otpHash,
            otp_sent_at: otpSentAt,
            otp_verified_at: otpVerifiedAt,
            otp_attempts: 1,
            encryption_key: encryptionKey.substring(0, 16),
            iv,
            initiated_at: initiatedAt,
            completed_at: completedAt,
            updated_at: completedAt,
          },
        });

        // Create transaction logs
        await prisma.transaction_logs.createMany({
          data: [
            {
              id: uuidv4(),
              transaction_id: transaction.id,
              action: 'TRANSACTION_INITIATED',
              status: TransactionStatus.INITIATED,
              metadata: {},
            },
            {
              id: uuidv4(),
              transaction_id: transaction.id,
              action: 'QR1_GENERATED',
              status: TransactionStatus.INITIATED,
              metadata: {},
            },
            {
              id: uuidv4(),
              transaction_id: transaction.id,
              action: 'QR1_SCANNED',
              status: TransactionStatus.QR1_SCANNED,
              metadata: {},
            },
            {
              id: uuidv4(),
              transaction_id: transaction.id,
              action: 'QR2_GENERATED',
              status: TransactionStatus.QR2_GENERATED,
              metadata: {},
            },
            {
              id: uuidv4(),
              transaction_id: transaction.id,
              action: 'QR2_SCANNED',
              status: TransactionStatus.QR2_SCANNED,
              metadata: {},
            },
            {
              id: uuidv4(),
              transaction_id: transaction.id,
              action: 'OTP_SENT',
              status: TransactionStatus.OTP_SENT,
              metadata: {},
            },
            {
              id: uuidv4(),
              transaction_id: transaction.id,
              action: 'OTP_VERIFIED',
              status: TransactionStatus.OTP_VERIFIED,
              metadata: {},
            },
            {
              id: uuidv4(),
              transaction_id: transaction.id,
              action: 'TRANSACTION_COMPLETED',
              status: TransactionStatus.COMPLETED,
              metadata: {},
            },
          ],
        });

        transactions.push(transaction);
        transactionCount++;
        console.log(`      ✅ Created completed transaction: ${transactionNumber} (₹${amount})`);
      } catch (error: any) {
        console.error(`      ❌ Failed to create transaction: ${error.message}`);
      }
    }

    // Create 1 initiated transaction (with QR1 only)
    if (regularUsers.length > 0) {
      try {
        const sender = adminUser;
        const receiver = regularUsers[0];
        const amount = (Math.random() * 5000 + 500).toFixed(2);
        const transactionNumber = `TXN${nanoid(10).toUpperCase()}`;
        
        const encryptionKey = EncryptionService.generateKey();
        const iv = EncryptionService.generateIV();

        const initiatedAt = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        const qr1GeneratedAt = new Date(initiatedAt.getTime() + 1 * 60 * 1000);
        const qr1ExpiresAt = new Date(qr1GeneratedAt.getTime() + 15 * 60 * 1000);

        const qr1Data = {
          transactionId: uuidv4(),
          type: 'qr1' as const,
          amount: Number(amount),
          senderId: sender.id,
          receiverId: receiver.id,
          timestamp: qr1GeneratedAt.getTime(),
          expiresAt: qr1ExpiresAt.getTime(),
          nonce: nanoid(16),
        };

        const { qrCodeImage: qr1Image, encryptedData: qr1Encrypted } = await QRService.generateQR(
          qr1Data,
          encryptionKey,
          iv
        );

        const transaction = await prisma.transactions.create({
          data: {
            id: uuidv4(),
            transaction_number: transactionNumber,
            sender_id: sender.id,
            company_id: sender.company_id,
            receiver_id: receiver.id,
            amount: amount,
            currency: 'INR',
            description: `Pending payment for ${receiver.first_name}`,
            status: TransactionStatus.INITIATED,
            qr1_code: qr1Image,
            qr1_encrypted_data: qr1Encrypted,
            qr1_generated_at: qr1GeneratedAt,
            qr1_expires_at: qr1ExpiresAt,
            encryption_key: encryptionKey.substring(0, 16),
            iv,
            initiated_at: initiatedAt,
            updated_at: initiatedAt,
          },
        });

        await prisma.transaction_logs.create({
          data: {
            id: uuidv4(),
            transaction_id: transaction.id,
            action: 'TRANSACTION_INITIATED',
            status: TransactionStatus.INITIATED,
            metadata: {},
          },
        });

        // Create notification for receiver
        await prisma.notifications.create({
          data: {
            id: uuidv4(),
            user_id: receiver.id,
            company_id: receiver.company_id,
            title: 'New Transaction Request',
            message: `You have a new transaction request for INR ${amount}`,
            type: 'TRANSACTION',
            priority: 'HIGH',
            action_url: `/transactions/${transaction.id}`,
            is_read: false,
          },
        });

        transactions.push(transaction);
        transactionCount++;
        console.log(`      ✅ Created initiated transaction: ${transactionNumber} (₹${amount})`);
      } catch (error: any) {
        console.error(`      ❌ Failed to create transaction: ${error.message}`);
      }
    }
  }

  // Create cross-company transactions
  if (companies.length >= 2) {
    console.log(`   Creating cross-company transactions...`);
    
    const company1Users = usersByCompany[companies[0]];
    const company2Users = usersByCompany[companies[1]];
    const sender = company1Users.find((u: any) => u.role === 'COMPANY_ADMIN') || company1Users[0];
    const receiver = company2Users.find((u: any) => u.role === 'COMPANY_ADMIN') || company2Users[0];

    if (sender && receiver) {
      try {
        const amount = (Math.random() * 15000 + 2000).toFixed(2);
        const transactionNumber = `TXN${nanoid(10).toUpperCase()}`;
        
        const encryptionKey = EncryptionService.generateKey();
        const iv = EncryptionService.generateIV();

        const initiatedAt = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        const qr1GeneratedAt = new Date(initiatedAt.getTime() + 1 * 60 * 1000);
        const qr1ExpiresAt = new Date(qr1GeneratedAt.getTime() + 15 * 60 * 1000);
        const qr2GeneratedAt = new Date(qr1GeneratedAt.getTime() + 3 * 60 * 1000);
        const qr2ExpiresAt = new Date(qr2GeneratedAt.getTime() + 10 * 60 * 1000);
        const otpSentAt = new Date(qr2GeneratedAt.getTime() + 1 * 60 * 1000);

        const qr1Data = {
          transactionId: uuidv4(),
          type: 'qr1' as const,
          amount: Number(amount),
          senderId: sender.id,
          receiverId: receiver.id,
          timestamp: qr1GeneratedAt.getTime(),
          expiresAt: qr1ExpiresAt.getTime(),
          nonce: nanoid(16),
        };

        const { qrCodeImage: qr1Image, encryptedData: qr1Encrypted } = await QRService.generateQR(
          qr1Data,
          encryptionKey,
          iv
        );

        const qr2Data = {
          transactionId: uuidv4(),
          type: 'qr2' as const,
          amount: Number(amount),
          senderId: sender.id,
          receiverId: receiver.id,
          timestamp: qr2GeneratedAt.getTime(),
          expiresAt: qr2ExpiresAt.getTime(),
          nonce: nanoid(16),
        };

        const { qrCodeImage: qr2Image, encryptedData: qr2Encrypted } = await QRService.generateQR(
          qr2Data,
          encryptionKey,
          iv
        );

        const otpHash = EncryptionService.hash('123456');

        const transaction = await prisma.transactions.create({
          data: {
            id: uuidv4(),
            transaction_number: transactionNumber,
            sender_id: sender.id,
            company_id: sender.company_id,
            receiver_id: receiver.id,
            amount: amount,
            currency: 'INR',
            description: `Cross-company payment`,
            status: TransactionStatus.OTP_SENT,
            qr1_code: qr1Image,
            qr1_encrypted_data: qr1Encrypted,
            qr1_generated_at: qr1GeneratedAt,
            qr1_expires_at: qr1ExpiresAt,
            qr2_code: qr2Image,
            qr2_encrypted_data: qr2Encrypted,
            qr2_generated_at: qr2GeneratedAt,
            qr2_expires_at: qr2ExpiresAt,
            otp_hash: otpHash,
            otp_sent_at: otpSentAt,
            otp_attempts: 0,
            encryption_key: encryptionKey.substring(0, 16),
            iv,
            initiated_at: initiatedAt,
            updated_at: otpSentAt,
          },
        });

        await prisma.transaction_logs.createMany({
          data: [
            {
              id: uuidv4(),
              transaction_id: transaction.id,
              action: 'TRANSACTION_INITIATED',
              status: TransactionStatus.INITIATED,
              metadata: {},
            },
            {
              id: uuidv4(),
              transaction_id: transaction.id,
              action: 'QR1_SCANNED',
              status: TransactionStatus.QR1_SCANNED,
              metadata: {},
            },
            {
              id: uuidv4(),
              transaction_id: transaction.id,
              action: 'QR2_SCANNED',
              status: TransactionStatus.QR2_SCANNED,
              metadata: {},
            },
            {
              id: uuidv4(),
              transaction_id: transaction.id,
              action: 'OTP_SENT',
              status: TransactionStatus.OTP_SENT,
              metadata: {},
            },
          ],
        });

        transactions.push(transaction);
        transactionCount++;
        console.log(`      ✅ Created cross-company transaction: ${transactionNumber} (₹${amount})`);
      } catch (error: any) {
        console.error(`      ❌ Failed to create cross-company transaction: ${error.message}`);
        // Continue even if this transaction fails
      }
    }
  }

  console.log('');
  return transactions;
}

/**
 * Main function
 */
async function main() {
  console.log('🎭 DEMO USERS CREATION SCRIPT');
  console.log('==============================\n');
  console.log('This script will:');
  console.log('  1. Delete ALL existing Firebase users');
  console.log('  2. Clear ALL database data');
  console.log('  3. Create 3 companies with demo users');
  console.log('  4. Create Firebase accounts for each user');
  console.log('  5. Create demo transactions with various statuses');
  console.log(`  6. Default password for all users: ${DEFAULT_PASSWORD}\n`);

  try {
    // Check Firebase Admin SDK initialization
    if (!auth) {
      console.error('❌ Firebase Admin SDK is not initialized!');
      console.error('Please check your .env file and ensure Firebase credentials are configured.');
      process.exit(1);
    }

    try {
      // Try to list users to verify Firebase Admin is working
      await auth.listUsers(1);
    } catch (firebaseError: any) {
      console.error('❌ Firebase Admin SDK credentials are invalid!');
      console.error('Please check your .env file and ensure Firebase credentials are correct.');
      console.error('Error:', firebaseError.message);
      process.exit(1);
    }

    // Check for --force flag to skip confirmation
    const forceFlag = process.argv.includes('--force') || process.argv.includes('-f');
    
    if (!forceFlag) {
      const confirmed = await askConfirmation('⚠️  This will delete ALL Firebase users and database data. Continue? (type "yes" to confirm): ');
      
      if (!confirmed) {
        console.log('\n❌ Operation cancelled.\n');
        await prisma.$disconnect();
        process.exit(0);
      }
      console.log('');
    } else {
      console.log('⚠️  Force flag detected. Skipping confirmation...\n');
    }

    // Step 1: Delete all Firebase users
    await deleteAllFirebaseUsers();

    // Step 2: Reset database
    await resetDatabase();

    // Step 3: Create companies
    const companies = await createCompanies();

    // Step 4: Create users with Firebase accounts
    const users = await createUsersWithFirebase(companies);

    // Step 5: Create demo transactions
    const transactions = await createDemoTransactions(users);

    // Summary
    console.log('================================\n');
    console.log('✅ Demo data creation completed! 🎉\n');
    console.log('📊 Summary:');
    console.log(`   • Companies created: ${companies.length}`);
    console.log(`   • Users created: ${users.length}`);
    console.log(`   • Admins: ${users.filter(u => u.role === 'COMPANY_ADMIN').length}`);
    console.log(`   • Regular users: ${users.filter(u => u.role === 'ACCOUNT_USER').length}`);
    console.log(`   • Transactions created: ${transactions.length}\n`);
    
    console.log('🔐 Login Credentials:');
    console.log(`   Default Password: ${DEFAULT_PASSWORD}\n`);
    
    console.log('📝 User Accounts:\n');
    companies.forEach((company, index) => {
      const companyUsers = users.filter(u => u.company_id === company.id);
      console.log(`   ${index + 1}. ${company.name}:`);
      companyUsers.forEach(user => {
        const roleLabel = user.role === 'COMPANY_ADMIN' ? '(Admin)' : '';
        console.log(`      • ${user.email} ${roleLabel}`);
      });
      console.log('');
    });

    console.log('✨ Demo users are ready! You can now log in with any email above using the default password.');

  } catch (error: any) {
    console.error('\n❌ Demo users creation failed:', error.message);
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

export { main, deleteAllFirebaseUsers, resetDatabase, createCompanies, createUsersWithFirebase, createDemoTransactions };

