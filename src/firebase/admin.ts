import { initializeApp, getApps, App, cert } from 'firebase-admin/app';

// This function ensures the Firebase Admin app is initialized only once.
export function initFirebaseAdminApp(): App {
  // Check if an app named 'admin' already exists.
  const existingApp = getApps().find(app => app.name === 'admin');
  if (existingApp) {
    return existingApp;
  }

  // In a deployed Firebase/Google Cloud environment, ADC are used automatically.
  // We check for a specific Google-provided environment variable to detect this.
  if (process.env.GCLOUD_PROJECT) {
      try {
        const app = initializeApp(undefined, 'admin');
        console.log("Firebase Admin SDK initialized using Application Default Credentials.");
        return app;
      } catch(e: any) {
        console.error("Automatic ADC initialization failed, even in a detected cloud environment.", e);
        // Fall through to try service account key as a last resort.
      }
  }
    
  // Fallback for local development using a service account key from environment variables.
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. This is required for local server-side development.");
  }

  try {
    // Decode the base64-encoded service account key.
    const serviceAccount = JSON.parse(Buffer.from(serviceAccountKey, 'base64').toString('utf-8'));
    const app = initializeApp({
      credential: cert(serviceAccount),
    }, 'admin');
    console.log("Firebase Admin SDK initialized with service account key.");
    return app;
  } catch (parseError: any) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Make sure it is a valid base64 encoded JSON string.", parseError);
    throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT_KEY.");
  }
}
