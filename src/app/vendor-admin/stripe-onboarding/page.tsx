'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase, useUser, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Terminal, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

type Vendor = {
  onboardingLink?: string | null;
};

export default function StripeOnboardingRedirectPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const vendorRef = useMemoFirebase(
    () => (user ? doc(firestore, 'vendors', user.uid) : null),
    [user, firestore]
  );
  const { data: vendorData, isLoading: isVendorLoading } = useDoc<Vendor>(vendorRef);

  useEffect(() => {
    // Wait until data is loaded
    if (isUserLoading || isVendorLoading) return;

    // Check if vendor data and the link exist
    if (vendorData) {
      if (vendorData.onboardingLink) {
        // Redirect to the Stripe onboarding URL
        window.location.href = vendorData.onboardingLink;
        
        // After redirecting, nullify the link in Firestore so it can't be reused.
        // This is a "fire-and-forget" operation.
        updateDocumentNonBlocking(vendorRef!, { onboardingLink: null });
      } else {
        // If the link is missing, it might have been used already. Guide the user.
        toast({
          title: 'Onboarding Complete or Link Expired',
          description: 'Redirecting you to your dashboard.',
          duration: 5000,
        });
        router.replace('/vendor-admin/dashboard');
      }
    }
  }, [vendorData, isUserLoading, isVendorLoading, vendorRef, router, toast]);

  if (isUserLoading || isVendorLoading) {
    return <div className="flex h-screen items-center justify-center"><Skeleton className="h-48 w-96" /></div>;
  }
  
  if (!vendorData?.onboardingLink) {
       return (
         <div className="flex h-screen items-center justify-center">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Redirecting...</CardTitle>
                    <CardDescription>Your onboarding link has been used. Redirecting you to the dashboard.</CardDescription>
                </CardHeader>
                 <CardContent className="flex justify-center items-center p-10">
                    <Loader2 className="h-12 w-12 animate-spin text-muted-foreground"/>
                </CardContent>
            </Card>
         </div>
       )
  }

  return (
    <div className="flex h-screen items-center justify-center">
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>Connecting to Stripe...</CardTitle>
                <CardDescription>Please wait while we securely redirect you to Stripe to complete your account setup.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center items-center p-10">
                <Loader2 className="h-12 w-12 animate-spin text-muted-foreground"/>
            </CardContent>
        </Card>
    </div>
  );
}
