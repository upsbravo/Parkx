
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { createStripeAccountSession } from '@/ai/flows/create-stripe-account-session-flow';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

const StripeConnectAccountOnboarding = dynamic(
  () => {
    // This dynamically loads the Stripe Connect JS script
    if (!document.querySelector('script[src="https://connect-js.stripe.com/v1.1/init.js"]')) {
        const script = document.createElement('script');
        script.src = "https://connect-js.stripe.com/v1.1/init.js";
        script.async = true;
        document.head.appendChild(script);
    }
    // @ts-ignore - Stripe's web component is not typed in a standard way
    return Promise.resolve((props) => <stripe-connect-account-onboarding {...props} />);
  },
  { 
    ssr: false,
    loading: () => (
        <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-1/3" />
        </div>
    ),
  }
);


type Vendor = {
    stripeAccountId?: string;
}

function OnboardingComponent() {
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
          if (!isVendorDataLoading && vendorData) {
            setError('Stripe Account ID is missing for this vendor. Please contact support.');
          }
          return;
      }
      
      try {
        const result = await createStripeAccountSession({ accountId: vendorData.stripeAccountId });
        if (result.client_secret) {
          setClientSecret(result.client_secret);
        } else if (result.error) {
          setError(result.error);
        } else {
          setError('Failed to retrieve client secret.');
        }
      } catch (err: any) {
        console.error('Error creating account session:', err);
        setError(err.message || 'An unexpected error occurred while setting up Stripe.');
      }
    };

    if(vendorData) {
        fetchAccountSession();
    }
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
  
  if (isVendorDataLoading || !clientSecret) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-1/3" />
      </div>
    );
  }

  return (
    <div className='min-h-[400px]'>
        <StripeConnectAccountOnboarding client-secret={clientSecret} />
    </div>
  );
}


export function StripeConnectOnboarding() {
  return <OnboardingComponent />;
}

