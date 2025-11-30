
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
  invoiceId: string;
  vendorId: string;
  stripeCustomerId?: string;
  amount: number; // in dollars
  onSuccessfulPayment: () => void;
};

export function CheckoutForm({ invoiceId, vendorId, stripeCustomerId, amount, onSuccessfulPayment }: CheckoutFormProps) {
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

    // This confirms the PaymentIntent that was created when the Elements group was initialized.
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Make sure to change this to your payment completion page
        return_url: `${window.location.origin}/vendor-admin/user-invoices?payment_success=true&invoice_id=${invoiceId}`,
      },
      // We are redirecting to a new page, so we don't need to handle the result here.
      // If you want to handle the result on the same page, you can use `redirect: 'if_required'`
    });

    if (error.type === "card_error" || error.type === "validation_error") {
      setErrorMessage(error.message || 'An unexpected error occurred.');
    } else {
       toast({
          variant: "destructive",
          title: 'Payment Error',
          description: error.message || 'An unexpected error occurred.',
      });
    }

    setIsLoading(false);
  };

  const paymentElementOptions: StripePaymentElementOptions = {
    layout: 'tabs',
  };

  return (
    <form id="payment-form" onSubmit={handleSubmit}>
      <PaymentElement id="payment-element" options={paymentElementOptions} />
      <Button disabled={isLoading || !stripe || !elements} id="submit" className="w-full mt-6">
        <span id="button-text">
          {isLoading ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
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
