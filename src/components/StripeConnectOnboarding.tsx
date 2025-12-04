'use client';

import { useEffect, useState, useRef } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { createStripeAccountSession } from '@/ai/flows/create-stripe-account-session-flow';
import { STRIPE_PUBLISHABLE_KEY } from '@/lib/stripe-config';

const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

type Vendor = {
  stripeAccountId?: string;
};

export function StripeConnectOnboarding() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  const vendorRef = useMemoFirebase(
    () => (user ? doc(firestore, 'vendors', user.uid) : null),
    [user, firestore]
  );
  const { data: vendorData, isLoading: isVendorLoading } = useDoc<Vendor>(vendorRef);

  useEffect(() => {
    if (!vendorData?.stripeAccountId) {
      if (!isVendorLoading && vendorData) {
        setError('Stripe Account ID is missing for this vendor. Please contact support.');
      }
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

  useEffect(() => {
    if (!clientSecret || !elementRef.current) {
      return;
    }

    const initializeStripe = async () => {
      const stripe = await stripePromise;
      if (!stripe || !elementRef.current) return;

      stripeRef.current = stripe;

      try {
        const connectOnboarding = stripe.createElement('connectAccountOnboarding', {
          clientSecret: clientSecret,
        });

        connectOnboarding.mount(elementRef.current);
        
        return () => {
          connectOnboarding.destroy();
        };
      } catch (e: any) {
        setError(`Failed to create Stripe element: ${e.message}`);
      }
    };

    const cleanupPromise = initializeStripe();

    return () => {
        cleanupPromise.then(cleanup => cleanup && cleanup());
    }

  }, [clientSecret]);

  if (error) {
    return (
      <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Stripe Connection Failed</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (isVendorLoading || !clientSecret) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return <div ref={elementRef} className="min-h-[500px]"></div>;
}
