/**
 * Create Firebase Authentication demo users
 */

const admin = require('firebase-admin');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  if (!privateKey) {
    console.error('❌ FIREBASE_PRIVATE_KEY not found in environment variables');
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  });
  console.log('✅ Firebase Admin SDK initialized\n');
}

const demoUsers = [
  {
    uid: 'firebase_admin_001',
    email: 'admin@techcorp.com',
    password: 'Demo@123456',
    displayName: 'Rajesh Kumar',
    phoneNumber: '+919876543210',
    emailVerified: true,
  },
  {
    uid: 'firebase_admin_002',
    email: 'admin@retailmart.com',
    password: 'Demo@123456',
    displayName: 'Priya Sharma',
    phoneNumber: '+919876543211',
    emailVerified: true,
  },
  {
    uid: 'firebase_sender_001',
    email: 'sender1@techcorp.com',
    password: 'Demo@123456',
    displayName: 'Amit Patel',
    phoneNumber: '+919876543220',
    emailVerified: true,
  },
  {
    uid: 'firebase_sender_002',
    email: 'sender2@retailmart.com',
    password: 'Demo@123456',
    displayName: 'Sneha Reddy',
    phoneNumber: '+919876543221',
    emailVerified: true,
  },
  {
    uid: 'firebase_receiver_001',
    email: 'receiver1@techcorp.com',
    password: 'Demo@123456',
    displayName: 'Vikram Singh',
    phoneNumber: '+919876543230',
    emailVerified: true,
  },
  {
    uid: 'firebase_receiver_002',
    email: 'receiver2@financeplus.com',
    password: 'Demo@123456',
    displayName: 'Ananya Iyer',
    phoneNumber: '+919876543231',
    emailVerified: true,
  },
  {
    uid: 'firebase_receiver_003',
    email: 'receiver3@retailmart.com',
    password: 'Demo@123456',
    displayName: 'Arjun Verma',
    phoneNumber: '+919876543232',
    emailVerified: true,
  },
];

async function createDemoUsers() {
  console.log('🔥 Creating Firebase demo users...\n');
  
  let successCount = 0;
  let existsCount = 0;
  let errorCount = 0;

  for (const userData of demoUsers) {
    try {
      await admin.auth().createUser(userData);
      successCount++;
      console.log(`✅ Created: ${userData.email} (${userData.displayName})`);
    } catch (error) {
      if (error.code === 'auth/uid-already-exists' || error.code === 'auth/email-already-exists') {
        existsCount++;
        console.log(`⚠️  Already exists: ${userData.email}`);
      } else {
        errorCount++;
        console.error(`❌ Error creating ${userData.email}:`, error.message);
      }
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Firebase users creation complete!');
  console.log(`   • Created: ${successCount}`);
  console.log(`   • Already existed: ${existsCount}`);
  if (errorCount > 0) {
    console.log(`   • Errors: ${errorCount}`);
  }
  console.log('='.repeat(50) + '\n');
  
  console.log('📋 Demo Credentials:');
  console.log('   Password (all users): Demo@123456\n');
  
  console.log('🔐 Login with any of these emails:');
  demoUsers.forEach(u => console.log(`   • ${u.email}`));
  console.log('');
}

createDemoUsers()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
