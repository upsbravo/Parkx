
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

// Initialize firebase client on the server
const { firestore } = initializeFirebase();

// This function needs to be a GET handler that can be called from the client
export async function GET(req: Request) {
  try {
    // This is a placeholder for getting the user.
    // In a real app, you would get the user from the session or a verified token.
    // For this example, we'll assume a hardcoded vendorId for demonstration.
    // NOTE: This is NOT secure for production. You must implement proper auth.
    const url = new URL(req.url);
    const vendorId = url.searchParams.get('vendorId');

    if (!vendorId) {
      return NextResponse.json({ error: 'Vendor ID is required' }, { status: 400 });
    }
    
    const vendorSnap = await getDoc(doc(firestore, 'vendors', vendorId));
    
    if (!vendorSnap.exists()) {
        return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const stripeAccountId = vendorSnap.data()?.stripeAccountId;

    if (!stripeAccountId) {
      return NextResponse.json({ error: 'No Stripe account linked for this vendor' }, { status: 400 });
    }

    const session = await stripe.accountSessions.create({
      account: stripeAccountId,
      components: {
        account_onboarding: { enabled: true },
      },
    });

    return NextResponse.json({ client_secret: session.client_secret });
  } catch (e: any) {
    console.error('API Route Error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
