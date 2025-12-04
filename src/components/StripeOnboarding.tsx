'use client';

import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { useUser } from '@/firebase';

export default function StripeOnboarding() {
  const { user } = useUser();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
        setIsLoading(false);
        return;
    };
    
    user.getIdToken().then(token => {
        fetch('/api/stripe/create-connect-session', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        })
        .then((res) => res.json())
        .then((data) => {
            if (data.client_secret) {
                setClientSecret(data.client_secret);
            } else {
                setError(data.error || 'Failed to initialize Stripe Onboarding.');
            }
        })
        .catch((e) => {
            console.error('Fetch error for Stripe session:', e);
            setError('A network error occurred. Please try again.');
        })
        .finally(() => {
            setIsLoading(false);
        });
    });

  }, [user]);

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
    return (
        <div className="min-h-[500px]">
            <stripe-connect-account-onboarding client-secret={clientSecret}></stripe-connect-account-onboarding>
        </div>
    );
  }

  return <div className="text-center py-12 text-muted-foreground">Initializing secure connection...</div>;
}
