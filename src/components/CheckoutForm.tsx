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
import { processStripePayment } from '@/ai/flows/process-stripe-payment-flow';
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

    // This creates a PaymentMethod and confirms the PaymentIntent in one go.
    const { error, paymentMethod } = await stripe.createPaymentMethod({
        elements,
    });

    if (error) {
        setErrorMessage(error.message || 'An unexpected error occurred.');
        setIsLoading(false);
        return;
    }
    
    if (paymentMethod) {
        try {
            const result = await processStripePayment({
                paymentMethodId: paymentMethod.id,
                invoiceId: invoiceId,
                vendorId: vendorId,
                amount: Math.round(amount * 100), // convert to cents
                currency: 'usd',
                customer: stripeCustomerId,
            });

            if (result.success) {
                toast({
                    title: 'Payment Successful!',
                    description: 'The invoice has been marked as paid.',
                });
                onSuccessfulPayment();
            } else {
                 setErrorMessage(result.message || 'Payment failed. Please try again.');
            }
        } catch (e: any) {
            setErrorMessage(e.message || 'A server error occurred.');
        }
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
