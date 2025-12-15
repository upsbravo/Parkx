
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { verifyStripeCheckoutSession } from '@/ai/flows/verify-stripe-checkout-session-flow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your payment...');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      setMessage('No payment session ID found. Please contact support.');
      return;
    }

    const verifyPayment = async () => {
      try {
        const result = await verifyStripeCheckoutSession({ sessionId });
        if (result.success) {
          setStatus('success');
          setMessage(result.message || 'Your payment was successful!');
        } else {
          setStatus('error');
          setMessage(result.message || 'Failed to verify payment. Please check your invoices or contact support.');
        }
      } catch (e: any) {
        setStatus('error');
        setMessage('An unexpected error occurred. Please contact support.');
      }
    };

    verifyPayment();
  }, [sessionId]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl">Payment Status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === 'loading' && (
            <>
              <Loader2 className="h-16 w-16 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">{message}</p>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle className="h-16 w-16 text-green-500" />
              <p className="font-semibold text-lg">{message}</p>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="h-16 w-16 text-destructive" />
              <p className="font-semibold text-lg text-destructive">{message}</p>
            </>
          )}
          <Button asChild className="mt-4">
            <Link href="/end-user/invoices">Return to Invoices</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentSuccessPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PaymentSuccessContent />
        </Suspense>
    )
}
