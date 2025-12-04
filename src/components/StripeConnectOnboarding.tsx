'use client';

import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, StripeConnectOnboarding as StripeOnboardingComponent } from '@stripe/react-stripe-js';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { useUser, useAuth } from '@/firebase';
import { STRIPE_PUBLISHABLE_KEY } from '@/lib/stripe-config';

// Load Stripe once with your publishable key
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

function OnboardingContent() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFetchingSecret, setIsFetchingSecret] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchConnectSession = async () => {
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

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch Stripe session.');
            }

            if (data.client_secret) {
                setClientSecret(data.client_secret);
            } else {
                setError(data.error || 'Failed to initialize Stripe session.');
            }
        } catch (e: any) {
             setError(e.message || 'A network error occurred.');
        } finally {
            setIsFetchingSecret(false);
        }
    };

    fetchConnectSession();

  }, [user]);

  if (isUserLoading || isFetchingSecret) {
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
         <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Could Not Load Component</AlertTitle>
            <AlertDescription>
                The client secret is missing. The onboarding component cannot be rendered.
            </AlertDescription>
        </Alert>
      )
  }

  return (
    <div className="min-h-[500px]">
      <StripeOnboardingComponent
        clientSecret={clientSecret}
        appearance={{ theme: 'stripe' }}
      />
    </div>
  );
}

export default function StripeConnectOnboarding() {
  return (
    <Elements stripe={stripePromise}>
      <OnboardingContent />
    </Elements>
  );
}
