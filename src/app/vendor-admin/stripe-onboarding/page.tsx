'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase, useUser, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink } from 'lucide-react';
import { createStripeAccountLink } from '@/ai/flows/create-stripe-account-link-flow';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

type Vendor = {
  stripeAccountId?: string;
  onboardingLink?: string | null;
};

export default function StripeOnboardingPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const vendorRef = useMemoFirebase(
    () => (user ? doc(firestore, 'vendors', user.uid) : null),
    [user, firestore]
  );
  const { data: vendorData, isLoading: isVendorLoading } = useDoc<Vendor>(vendorRef);

  const handleConnect = async () => {
    if (!vendorData?.stripeAccountId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Stripe Account ID not found. Please contact support.'});
        return;
    }
    
    setIsRedirecting(true);
    
    try {
        const result = await createStripeAccountLink({
            accountId: vendorData.stripeAccountId,
            refreshUrl: window.location.href, // Re-visit this page if link expires
            returnUrl: `${window.location.origin}/vendor-admin/dashboard`, // Go to dashboard on success
        });

        if (result.url) {
            // After generating a new link, nullify the one-time link in the database.
            // This is "fire-and-forget" as the redirect is more important.
            updateDocumentNonBlocking(vendorRef!, { onboardingLink: null });
            window.location.href = result.url;
        } else {
            throw new Error(result.error || 'Failed to generate Stripe connection link.');
        }

    } catch (e: any) {
        toast({
            variant: 'destructive',
            title: 'Connection Failed',
            description: e.message
        });
        setIsRedirecting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 md:p-6 min-h-screen bg-muted">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Connect with Stripe</CardTitle>
          <CardDescription>
            The final step is to connect your Stripe account. This is required to receive payouts for your parking spots.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-10 space-y-6">
            <Alert>
                <Terminal className="h-4 w-4" />
                <AlertTitle>Action Required</AlertTitle>
                <AlertDescription>
                    Your account setup is incomplete. You must connect to Stripe to enable charges and payouts before you can access your dashboard.
                </AlertDescription>
            </Alert>
            <Button size="lg" onClick={handleConnect} disabled={isRedirecting || isVendorLoading}>
                {isRedirecting ? (
                    <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Redirecting to Stripe...
                    </>
                ) : (
                     <>
                        Connect with Stripe
                        <ExternalLink className="ml-2 h-5 w-5" />
                    </>
                )}
            </Button>
        </CardContent>
        <CardFooter className="text-center text-xs text-muted-foreground">
            You will be securely redirected to Stripe to complete your account setup.
        </CardFooter>
      </Card>
    </div>
  );
}
