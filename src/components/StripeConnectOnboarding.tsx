'use client';

import { useEffect, useState, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { createStripeAccountSession } from '@/ai/flows/create-stripe-account-session-flow';
import { STRIPE_PUBLISHABLE_KEY } from '@/lib/stripe-config';

type Vendor = {
  stripeAccountId?: string;
};

// This is the correct way to handle Stripe's web components in React.
// We dynamically load the script and then create the custom element.
export default function StripeConnectOnboardingWrapper() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScriptLoaded, setScriptLoaded] = useState(false);
  const onboardingElementRef = useRef<any>(null);

  const vendorRef = useMemoFirebase(
    () => (user ? doc(firestore, 'vendors', user.uid) : null),
    [user, firestore]
  );
  const { data: vendorData, isLoading: isVendorLoading } = useDoc<Vendor>(vendorRef);

  // Effect 1: Load the Stripe Connect JS script
  useEffect(() => {
    if (document.querySelector('script[src="https://connect-js.stripe.com/v1.1/init.js"]')) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://connect-js.stripe.com/v1.1/init.js';
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => setError('Failed to load Stripe Connect script.');
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // Effect 2: Fetch the client secret once the vendor data is available
  useEffect(() => {
    if (isVendorLoading || !vendorData) return;

    if (!vendorData.stripeAccountId) {
      setError('Stripe Account ID is missing for this vendor. Please contact support.');
      return;
    }

    createStripeAccountSession({ accountId: vendorData.stripeAccountId })
      .then((result) => {
        if (result.client_secret) {
          setClientSecret(result.client_secret);
        } else {
          setError(result.error || 'Failed to initialize Stripe session.');
        }
      })
      .catch((e) => {
        console.error('Error creating account session:', e);
        setError('An unexpected network error occurred.');
      });
  }, [vendorData, isVendorLoading]);
  
  // Effect 3: Set the client secret on the web component once it's available
  useEffect(() => {
      if (onboardingElementRef.current && clientSecret) {
          onboardingElementRef.current.clientSecret = clientSecret;
      }
  }, [clientSecret]);
  

  if (isVendorLoading || !isScriptLoaded) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Loading Payout Setup...</p>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Stripe Connection Failed</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!clientSecret) {
    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Initializing Stripe session...</p>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
        </div>
    );
  }

  // Once everything is ready, we render the custom web component.
  // React can render custom elements like 'stripe-connect-account-onboarding' if you provide a ref.
  return (
    <div className="min-h-[500px]">
        {/* @ts-ignore */}
        <stripe-connect-account-onboarding ref={onboardingElementRef} />
    </div>
  );
}
