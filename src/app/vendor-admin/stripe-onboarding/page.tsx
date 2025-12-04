'use client';

import StripeOnboarding from '@/components/StripeOnboarding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

export default function StripeOnboardingPage() {
  return (
    <div className="flex flex-col items-center justify-center p-4 md:p-6 min-h-[calc(100vh-10rem)]">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-2xl">Set Up Payouts with Stripe</CardTitle>
          <CardDescription>
            The final step is to set up your account with Stripe to securely receive payments and manage your business information. Please complete the form below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StripeOnboarding />
        </CardContent>
        <CardFooter className="flex-col items-start gap-4 border-t pt-6">
            <p className="text-sm text-muted-foreground">Once you have completed the Stripe onboarding, you will be redirected to your dashboard.</p>
            <div className="flex justify-end w-full">
                 <Button asChild>
                    <Link href="/vendor-admin/dashboard">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Finish & Go to Dashboard
                    </Link>
                </Button>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}
