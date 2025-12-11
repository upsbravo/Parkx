
'use server';
/**
 * @fileOverview A server-side flow to securely create a Stripe PaymentIntent.
 * This is used to initialize a payment session on the client without exposing secret keys.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const CreateStripePaymentIntentInputSchema = z.object({
  amount: z.number().int().min(50).describe("The amount to charge, in the smallest currency unit (e.g., cents)."),
  currency: z.string().default('usd').describe("The three-letter ISO currency code."),
  customer: z.string().optional().describe("The Stripe Customer ID."),
  vendorId: z.string().describe("The Stripe Connected Account ID of the vendor receiving the payment."),
});
export type CreateStripePaymentIntentInput = z.infer<typeof CreateStripePaymentIntentInputSchema>;

const CreateStripePaymentIntentOutputSchema = z.object({
  clientSecret: z.string().optional().describe('The client secret of the created PaymentIntent.'),
  error: z.string().optional().describe('An error message if creation failed.'),
});
export type CreateStripePaymentIntentOutput = z.infer<typeof CreateStripePaymentIntentOutputSchema>;

export async function createStripePaymentIntent(
  input: CreateStripePaymentIntentInput
): Promise<CreateStripePaymentIntentOutput> {
  return createStripePaymentIntentFlow(input);
}

const createStripePaymentIntentFlow = ai.defineFlow(
  {
    name: 'createStripePaymentIntentFlow',
    inputSchema: CreateStripePaymentIntentInputSchema,
    outputSchema: CreateStripePaymentIntentOutputSchema,
  },
  async ({ amount, currency, customer, vendorId }) => {
    if (!process.env.STRIPE_SECRET_KEY) {
      return { error: 'Stripe is not configured on the server.' };
    }

    try {
      const { default: Stripe } = await import('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      
      // For now, we will assume a 5% platform fee. This can be made configurable later.
      const applicationFeeAmount = Math.round(amount * 0.05);

      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        customer,
        application_fee_amount: applicationFeeAmount,
        on_behalf_of: vendorId, // This is the crucial part for the statement descriptor
        transfer_data: {
          destination: vendorId,
        },
      });

      return { clientSecret: paymentIntent.client_secret };
    } catch (e: any) {
      console.error('Error creating PaymentIntent:', e);
      return {
        error: e.message || 'An unexpected error occurred while preparing the payment.',
      };
    }
  }
);
