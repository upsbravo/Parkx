import { initializeApp, getApps, App, cert } from 'firebase-admin/app';

let adminApp: App;

export function initFirebaseAdminApp(): App {
  if (getApps().some(app => app.name === 'admin')) {
    return getApps().find(app => app.name === 'admin')!;
  }

  try {
    // This will work in a deployed Firebase environment
    adminApp = initializeApp(undefined, 'admin');
    console.log("Firebase Admin SDK initialized automatically.");
    return adminApp;
  } catch (e) {
    console.warn("Automatic Firebase Admin SDK initialization failed, trying with service account...");

    // Fallback for local development
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. Required for local development.");
    }
    try {
        const serviceAccount = JSON.parse(Buffer.from(serviceAccountKey, 'base64').toString('utf-8'));
        adminApp = initializeApp({
            credential: cert(serviceAccount)
        }, 'admin');
        console.log("Firebase Admin SDK initialized with service account.");
        return adminApp;
    } catch(parseError) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Make sure it is a valid base64 encoded JSON string.");
        throw parseError;
    }
  }
}

export const admin = adminApp;
