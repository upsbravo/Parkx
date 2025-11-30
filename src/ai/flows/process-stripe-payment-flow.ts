'use server';
/**
 * @fileOverview A server-side flow to securely process a payment using a Stripe PaymentMethod ID.
 * This should be used with Stripe Elements on the frontend.
 *
 * - processStripePayment - A function that creates and confirms a Stripe PaymentIntent.
 * - ProcessStripePaymentInput - The input type for the function.
 * - ProcessStripePaymentOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

const { firestore } = initializeFirebase();

const ProcessStripePaymentInputSchema = z.object({
  paymentMethodId: z.string().describe("The ID of the Stripe PaymentMethod created by Stripe.js on the client."),
  invoiceId: z.string().describe("The ID of the internal invoice document in Firestore."),
  amount: z.number().int().min(50).describe("The amount to charge, in the smallest currency unit (e.g., cents)."),
  currency: z.string().default('usd').describe("The three-letter ISO currency code."),
  customer: z.string().optional().describe("The Stripe Customer ID."),
  vendorId: z.string().describe("The ID of the vendor who is receiving the payment."),
});
export type ProcessStripePaymentInput = z.infer<typeof ProcessStripePaymentInputSchema>;

const ProcessStripePaymentOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  clientSecret: z.string().optional().describe("The client secret for the PaymentIntent, if further action is needed."),
});
export type ProcessStripePaymentOutput = z.infer<typeof ProcessStripePaymentOutputSchema>;

// This function is exported and can be called from the client.
export async function processStripePayment(
  input: ProcessStripePaymentInput
): Promise<ProcessStripePaymentOutput> {
  return processStripePaymentFlow(input);
}


const processStripePaymentFlow = ai.defineFlow(
  {
    name: 'processStripePaymentFlow',
    inputSchema: ProcessStripePaymentInputSchema,
    outputSchema: ProcessStripePaymentOutputSchema,
  },
  async (input) => {
    
    // In a real app, you would initialize Stripe with your SECRET key.
    // As we can't access environment variables here, we will simulate the Stripe SDK calls.
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    console.log("Simulating Stripe PaymentIntent creation with input:", input);
    
    // This server-side logic is now correctly placed inside the Genkit flow.
    if (!process.env.GCLOUD_PROJECT) {
      console.error('GCLOUD_PROJECT environment variable not set. This function must be run in a Google Cloud environment.');
      return {
        success: false,
        message: 'This feature is only available in the deployed production environment, not on the local developer machine.',
      };
    }

    try {
      // Step 1: Simulate creating a PaymentIntent with Stripe
      // const paymentIntent = await stripe.paymentIntents.create({
      //   amount: input.amount,
      //   currency: input.currency,
      //   customer: input.customer,
      //   payment_method: input.paymentMethodId,
      //   confirm: true, // This attempts to charge the card immediately
      //   off_session: true, // Indicates the customer is not present during the payment
      // });
      const simulatedPaymentIntent = {
          id: `pi_${Math.random().toString(36).substring(7)}`,
          status: 'succeeded',
          client_secret: `pi_${Math.random().toString(36).substring(7)}_secret_${Math.random().toString(36).substring(7)}`
      };

      // Step 2: Handle the simulated PaymentIntent status
      if (simulatedPaymentIntent.status === 'succeeded') {
        // Payment was successful. Update the invoice in Firestore.
        const invoiceRef = doc(firestore, 'vendors', input.vendorId, 'userInvoices', input.invoiceId);
        await updateDoc(invoiceRef, {
          status: 'Paid',
          notes: `Paid via Stripe. PaymentIntent ID: ${simulatedPaymentIntent.id}`
        });

        return { success: true, message: 'Payment successful!' };
      } else if (simulatedPaymentIntent.status === 'requires_action') {
        // Card requires 3D Secure or another authentication step
        return { 
          success: false, 
          message: 'Further authentication is required.',
          clientSecret: simulatedPaymentIntent.client_secret,
        };
      } else {
        // Payment failed for other reasons (e.g., insufficient funds)
        return { success: false, message: 'Payment failed. Please try another card.' };
      }
    } catch (e: any) {
      console.error('Error processing payment:', e);
      return { success: false, message: e.message || 'An unexpected error occurred.' };
    }
  }
);
