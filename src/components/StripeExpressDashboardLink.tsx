
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { createStripeLoginLink } from '@/ai/flows/create-stripe-login-link-flow';
import { ExternalLink, Loader2 } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { Terminal } from 'lucide-react';

type Vendor = {
  stripeAccountId?: string;
};

export function StripeExpressDashboardLink() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const vendorRef = useMemoFirebase(
    () => (user ? doc(firestore, 'vendors', user.uid) : null),
    [user, firestore]
  );
  const { data: vendorData, isLoading: isVendorLoading } = useDoc<Vendor>(vendorRef);

  const handleRedirect = async () => {
    if (!vendorData?.stripeAccountId) {
      toast({
        variant: 'destructive',
        title: 'Stripe Account Not Found',
        description: 'Your Stripe account ID is missing. Please contact support.',
      });
      return;
    }
    setIsLoading(true);
    try {
      const result = await createStripeLoginLink({
        stripeAccountId: vendorData.stripeAccountId,
      });

      if (result.url) {
        window.location.href = result.url;
      } else {
        throw new Error(result.error || 'Failed to generate login link.');
      }
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: e.message,
      });
      setIsLoading(false);
    }
  };

  if (isVendorLoading) {
    return <p>Loading vendor information...</p>;
  }

  if (!vendorData?.stripeAccountId) {
    return (
       <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Stripe Account Not Configured</AlertTitle>
        <AlertDescription>
            We couldn't find a Stripe Account ID for your profile. Please contact support to resolve this issue.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Button onClick={handleRedirect} disabled={isLoading}>
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Redirecting to Stripe...
        </>
      ) : (
        <>
          Manage Payouts on Stripe
          <ExternalLink className="ml-2 h-4 w-4" />
        </>
      )}
    </Button>
  );
}
