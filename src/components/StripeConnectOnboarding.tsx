'use client';

import { useEffect, useState, useRef } from 'react';
import { useUser } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { STRIPE_PUBLISHABLE_KEY } from '@/lib/stripe-config';

// Load Stripe outside of the component to avoid recreating it on every render.
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

export default function StripeConnectOnboarding() {
  const { user, isUserLoading } = useUser();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFetchingSecret, setIsFetchingSecret] = useState(true);

  // Ref for the div where the Stripe element will be mounted.
  const onboardingElementRef = useRef<HTMLDivElement>(null);

  // Effect to fetch the client secret from our API route.
  useEffect(() => {
    if (!user) return;

    const fetchSession = async () => {
      try {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/stripe/create-connect-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`,
            },
        });
        
        const data = await response.json();

        if (!response.ok || data.error) {
          throw new Error(data.error || 'Failed to fetch Stripe session.');
        }
        
        setClientSecret(data.client_secret);

      } catch (e: any) {
        setError(e.message || 'A network error occurred.');
      } finally {
        setIsFetchingSecret(false);
      }
    };

    fetchSession();
  }, [user]);

  // Effect to create and mount the Stripe element once we have the secret.
  useEffect(() => {
    if (!clientSecret || !onboardingElementRef.current) {
      return;
    }

    let stripe: Stripe | null = null;
    
    const mountStripeElement = async () => {
        stripe = await stripePromise;
        if (!stripe) {
            setError("Stripe.js failed to load.");
            return;
        }

        // The Connect Account Onboarding element is created and mounted programmatically.
        const connectElement = stripe.createElement('connectAccountOnboarding', {
          clientSecret,
        });
        
        if (onboardingElementRef.current) {
            onboardingElementRef.current.innerHTML = ''; // Clear previous content
            connectElement.mount(onboardingElementRef.current);
        }

    }

    mountStripeElement();

    return () => {
        // Cleanup on unmount
        if(onboardingElementRef.current) {
            onboardingElementRef.current.innerHTML = '';
        }
    };
  }, [clientSecret]);
  
  const isLoading = isUserLoading || isFetchingSecret;

  if (isLoading) {
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

  // This div is the mount point for the Stripe element.
  return <div ref={onboardingElementRef} className="min-h-[500px]" />;
}
