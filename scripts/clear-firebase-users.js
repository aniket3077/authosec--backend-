/**
 * Clear all Firebase Authentication users
 * WARNING: This will delete ALL users from Firebase!
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

async function deleteAllUsers() {
  console.log('🔥 Starting Firebase user deletion...\n');
  
  let nextPageToken;
  let deletedCount = 0;
  let errorCount = 0;

  try {
    do {
      const result = await admin.auth().listUsers(1000, nextPageToken);
      
      console.log(`📋 Found ${result.users.length} users to delete...`);
      
      // Delete users in batches
      const deletePromises = result.users.map(user => 
        admin.auth().deleteUser(user.uid)
          .then(() => {
            deletedCount++;
            console.log(`   ✓ Deleted: ${user.email || user.phoneNumber || user.uid}`);
          })
          .catch(error => {
            errorCount++;
            console.error(`   ✗ Error deleting ${user.uid}:`, error.message);
          })
      );
      
      await Promise.all(deletePromises);
      nextPageToken = result.pageToken;
      
    } while (nextPageToken);

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Deletion complete!`);
    console.log(`   • Successfully deleted: ${deletedCount} users`);
    if (errorCount > 0) {
      console.log(`   • Errors: ${errorCount}`);
    }
    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Confirm before deletion
console.log('⚠️  WARNING: This will delete ALL users from Firebase Authentication!');
console.log('   Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');

setTimeout(() => {
  deleteAllUsers()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}, 3000);
