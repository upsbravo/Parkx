
'use client';

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { createStripeAccountSession } from '@/ai/flows/create-stripe-account-session-flow';
import { STRIPE_PUBLISHABLE_KEY } from '@/lib/stripe-config';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

// Load Stripe.js outside of a component's render to avoid
// recreating the Stripe object on every render.
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

type Vendor = {
    stripeAccountId: string;
}

function OnboardingForm() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const vendorRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'vendors', user.uid);
  }, [user, firestore]);

  const {data: vendorData, isLoading: isVendorDataLoading} = useDoc<Vendor>(vendorRef);


  useEffect(() => {
    const fetchAccountSession = async () => {
      if (!vendorData || !vendorData.stripeAccountId) {
          if (!isVendorDataLoading && vendorData) { // Only error if done loading and still no ID
            setError('Stripe Account ID is missing for this vendor. Please contact support.');
          }
          return;
      }
      
      try {
        const result = await createStripeAccountSession({ accountId: vendorData.stripeAccountId });
        if (result.client_secret) {
          setClientSecret(result.client_secret);
        } else if (result.error) {
          setError(result.error); // Set the error in state instead of throwing
        } else {
          setError('Failed to retrieve client secret.');
        }
      } catch (err: any) {
        console.error('Error creating account session:', err);
        setError(err.message || 'An unexpected error occurred while setting up Stripe.');
      }
    };

    fetchAccountSession();
  }, [vendorData, isVendorDataLoading]);

  if (error) {
    return (
      <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Connection Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  if (!clientSecret || isVendorDataLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-1/3" />
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <div className='min-h-[400px]'>
         {/* @ts-ignore */}
        <stripe-connect-account-onboarding client-secret={clientSecret} />
      </div>
    </Elements>
  );
}

export function StripeConnectOnboarding() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // This component relies on browser APIs, so we ensure it only renders on the client.
    setIsClient(true);
    
    // Dynamically load the Stripe Connect JS script if it doesn't already exist.
    if (!document.querySelector('script[src="https://connect-js.stripe.com/v1.1/init.js"]')) {
      const script = document.createElement('script');
      script.src = "https://connect-js.stripe.com/v1.1/init.js";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  if (!isClient) {
    return (
        <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-1/3" />
        </div>
    );
  }

  return <OnboardingForm />;
}
