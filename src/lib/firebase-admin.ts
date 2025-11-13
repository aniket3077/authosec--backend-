import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  // Only initialize if we have valid credentials (not placeholder values)
  if (privateKey && !privateKey.includes('YOUR_PRIVATE_KEY_HERE')) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
      console.log('✅ Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.error('❌ Firebase Admin SDK initialization failed:', error);
      console.error('Please check your .env file and follow GET_FIREBASE_CREDENTIALS.md');
    }
  } else {
    console.warn('⚠️  Firebase credentials not configured. Please update .env file.');
    console.warn('📖 See GET_FIREBASE_CREDENTIALS.md for instructions.');
  }
}

export const auth = admin.apps.length ? admin.auth() : null as any;
export const db = admin.apps.length ? admin.firestore() : null as any;
export const storage = admin.apps.length ? admin.storage() : null as any;
export const realtimeDb = admin.apps.length ? admin.database() : null as any;

export default admin;
