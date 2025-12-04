
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initFirebaseAdminApp } from '@/firebase/admin';

// Initialize Firebase Admin SDK
initFirebaseAdminApp();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const vendorId = decodedToken.uid;

    if (!vendorId) {
        return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    // Get the vendor's Stripe Account ID from Firestore
    const vendorDoc = await getFirestore()
      .collection('vendors')
      .doc(vendorId)
      .get();

    if (!vendorDoc.exists) {
        return NextResponse.json({ error: 'Vendor not found in database' }, { status: 404 });
    }
    
    const stripeAccountId = vendorDoc.data()?.stripeAccountId;
    
    if (!stripeAccountId) {
      return NextResponse.json({ error: 'Stripe Account ID not found for this vendor.' }, { status: 400 });
    }

    // Create the Account Session for the frontend
    const accountSession = await stripe.accountSessions.create({
      account: stripeAccountId,
      components: {
        account_onboarding: { enabled: true },
      },
    });

    return NextResponse.json({ client_secret: accountSession.client_secret });
  } catch (error: any) {
    console.error('Stripe Account Session creation failed:', error);
    // Differentiate between auth errors and other errors
    if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
        return NextResponse.json({ error: 'Authentication token is invalid. Please log in again.' }, { status: 401 });
    }
    return NextResponse.json({ error: `Server error: ${error.message}` }, { status: 500 });
  }
}
