
'use client';

import React, { useState } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { StripePaymentElementOptions } from '@stripe/stripe-js';
import { useToast } from '@/hooks/use-toast';

type CheckoutFormProps = {
  onSuccessfulPayment: () => void;
  clientSecret: string;
};

export function CheckoutForm({ onSuccessfulPayment, clientSecret }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js has not yet loaded.
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        // Make sure to change this to your payment completion page
        return_url: `${window.location.origin}/end-user/invoices?payment_status=success`,
      },
      redirect: 'if_required' // This prevents a full-page redirect for cards that don't require 3D Secure
    });

    if (error) {
      if (error.type === "card_error" || error.type === "validation_error") {
        setErrorMessage(error.message || 'An unexpected error occurred.');
      } else {
        setErrorMessage("An unexpected error occurred.");
      }
      setIsLoading(false);
    } else {
        // The payment has been processed successfully or is awaiting authentication.
        // If `redirect` is 'if_required', and no redirect is needed, the promise resolves.
        // We can then call our success handler.
        toast({
            title: 'Payment Successful!',
            description: 'The invoice has been paid.',
        });
        onSuccessfulPayment();
        setIsLoading(false);
    }
  };

  const paymentElementOptions: StripePaymentElementOptions = {
    layout: 'tabs',
  };

  return (
    <form id="payment-form" onSubmit={handleSubmit}>
      <PaymentElement id="payment-element" options={paymentElementOptions} />
      <Button disabled={isLoading || !stripe || !elements} id="submit" className="w-full mt-6">
        <span id="button-text">
          {isLoading ? 'Processing...' : 'Pay Now'}
        </span>
      </Button>
      
      {errorMessage && (
        <Alert variant="destructive" className="mt-4">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Payment Error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
