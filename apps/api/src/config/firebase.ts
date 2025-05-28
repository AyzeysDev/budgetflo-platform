// apps/api/src/config/firebase.ts
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

// Option 1: Using a service account JSON file path (recommended for local dev)
// Set GOOGLE_APPLICATION_CREDENTIALS environment variable to the path of your service account key file.
// Example: GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/serviceAccountKey.json"

// Option 2: Using individual environment variables (better for some deployment platforms)
// Ensure these are set in your .env file or environment
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
// For FIREBASE_PRIVATE_KEY, ensure newlines are handled correctly (e.g., replace \n with actual newlines)
const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

let initialized = false;

if (admin.apps.length === 0) {
  try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      console.log('Firebase Admin SDK initialized with Application Default Credentials.');
      initialized = true;
    } else if (firebaseProjectId && firebaseClientEmail && firebasePrivateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: firebaseProjectId,
          clientEmail: firebaseClientEmail,
          privateKey: firebasePrivateKey,
        }),
      });
      console.log('Firebase Admin SDK initialized with explicit credentials.');
      initialized = true;
    } else {
      console.error(
        'Firebase Admin SDK initialization failed: Missing credentials. ' +
        'Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables.'
      );
    }
  } catch (error) {
    console.error('Firebase Admin SDK initialization error:', error);
  }
} else {
  console.log('Firebase Admin SDK already initialized.');
  initialized = true;
}

const firestore = initialized ? admin.firestore() : null;
const auth = initialized ? admin.auth() : null;

export { firestore, auth, admin as firebaseAdmin, initialized as firebaseInitialized };
