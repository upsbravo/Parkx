
'use client';

import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { createStripeAccountSession } from '@/ai/flows/create-stripe-account-session-flow';

type Vendor = {
  stripeAccountId?: string;
};

export default function StripePayouts() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const vendorRef = useMemoFirebase(
    () => (user ? doc(firestore, 'vendors', user.uid) : null),
    [user, firestore]
  );
  const { data: vendorData, isLoading: isVendorLoading } = useDoc<Vendor>(vendorRef);

  useEffect(() => {
    if (isVendorLoading) return;
    if (!vendorData?.stripeAccountId) {
      setError('Your Stripe Account ID could not be found. Please contact support.');
      setIsLoading(false);
      return;
    }

    createStripeAccountSession({ accountId: vendorData.stripeAccountId })
      .then(data => {
        if (data.client_secret) {
          setClientSecret(data.client_secret);
        } else {
          setError(data.error || 'Failed to initialize Stripe Dashboard. Please try again.');
        }
      })
      .catch((e) => {
        console.error('API call failed:', e);
        setError('A network error occurred. Please try again.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [vendorData, isVendorLoading]);

  // Dynamically load the Stripe connect-js script
  useEffect(() => {
    const scriptId = 'stripe-connect-js';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://connect-js.stripe.com/v1.1/init.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
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

  if (clientSecret) {
    // This is how you render a web component in React.
    // Use `stripe-connect-account-onboarding` to render the full Stripe Express Dashboard.
    const StripeConnectAccountOnboarding = 'stripe-connect-account-onboarding' as any;
    return (
        <div className="min-h-[500px]">
            <StripeConnectAccountOnboarding client-secret={clientSecret} />
        </div>
    );
  }

  return <div className="text-center py-12 text-muted-foreground">Initializing secure connection...</div>;
}
