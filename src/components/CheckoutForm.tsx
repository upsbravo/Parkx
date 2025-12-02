
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
import { processStripePayment } from '@/ai/flows/process-stripe-payment-flow';

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

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setErrorMessage(submitError.message || 'An unexpected error occurred.');
      setIsLoading(false);
      return;
    }

    try {
        const {error: paymentMethodError, paymentMethod} = await stripe.createPaymentMethod({
            elements,
        });

        if(paymentMethodError) {
            setErrorMessage(paymentMethodError.message || 'An unexpected error occurred.');
            setIsLoading(false);
            return;
        }

        const result = await processStripePayment({
            paymentMethodId: paymentMethod.id,
            invoiceId,
            vendorId,
            amount: Math.round(amount * 100),
            currency: 'usd',
            customer: stripeCustomerId,
        });

        if (result.success) {
            toast({
                title: 'Payment Successful!',
                description: 'The invoice has been paid.',
            });
            onSuccessfulPayment();
        } else if (result.clientSecret) {
            // Needs 3D secure authentication
            const { error: confirmError } = await stripe.confirmPayment({
                clientSecret: result.clientSecret,
                confirmParams: {
                    return_url: window.location.href, // Or a dedicated success page
                },
                redirect: 'if_required' // Handle redirect within the page
            });

            if (confirmError) {
                setErrorMessage(confirmError.message || 'Could not confirm payment.');
            } else {
                 toast({
                    title: 'Payment Successful!',
                    description: 'The invoice has been paid after authentication.',
                });
                onSuccessfulPayment();
            }
        }
        else {
            setErrorMessage(result.message || 'Payment processing failed.');
        }

    } catch (e: any) {
        setErrorMessage(e.message || 'An unexpected error occurred during payment.');
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
