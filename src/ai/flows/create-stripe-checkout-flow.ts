'use server';
/**
 * @fileOverview A server-side flow to securely create a Stripe Checkout session.
 * This acts as a wrapper around the Firebase Stripe extension's Cloud Function,
 * allowing it to be called from the client without exposing the function publicly.
 *
 * - createStripeCheckout - A function that calls the Stripe extension's function.
 * - CreateStripeCheckoutInput - The input type for the function.
 * - CreateStripeCheckoutOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const LineItemSchema = z.object({
  price: z.string().describe("The ID of the Stripe Price object."),
  quantity: z.number().int().min(1).describe("The quantity of the price object."),
});

const CreateStripeCheckoutInputSchema = z.object({
  line_items: z.array(LineItemSchema).min(1).describe("An array of line items, each with a price and quantity."),
  successUrl: z.string().url().describe('The URL to redirect to on success.'),
  cancelUrl: z.string().url().describe('The URL to redirect to on cancellation.'),
  promoCode: z.string().optional().describe('An optional promotion code.'),
  uid: z.string().describe("The UID of the authenticated user."),
});
export type CreateStripeCheckoutInput = z.infer<typeof CreateStripeCheckoutInputSchema>;

const CreateStripeCheckoutOutputSchema = z.object({
  url: z.string().url().optional().describe('The URL for the Stripe Checkout session.'),
  error: z.string().optional().describe('An error message if the session creation failed.'),
});
export type CreateStripeCheckoutOutput = z.infer<typeof CreateStripeCheckoutOutputSchema>;

// This function is exported and can be called from the client.
export async function createStripeCheckout(
  input: CreateStripeCheckoutInput
): Promise<CreateStripeCheckoutOutput> {
  return createStripeCheckoutFlow(input);
}


const createStripeCheckoutFlow = ai.defineFlow(
  {
    name: 'createStripeCheckoutFlow',
    inputSchema: CreateStripeCheckoutInputSchema,
    outputSchema: CreateStripeCheckoutOutputSchema,
  },
  async (input) => {
    // This server-side logic is now correctly placed inside the Genkit flow.
    const { getAuth } = await import('google-auth-library');

    // This check prevents the function from running in a local environment where it cannot get credentials.
    if (!process.env.GCLOUD_PROJECT) {
      console.error('GCLOUD_PROJECT environment variable not set. This function must be run in a Google Cloud environment.');
      return {
        error: 'This feature is only available in the deployed production environment, not on the local developer machine.',
      };
    }
    if (!input.uid) {
      throw new Error('User must be authenticated to create a checkout session.');
    }

    // These should match your Firebase project details and function names.
    const projectId = process.env.GCLOUD_PROJECT;
    const location = 'us-central1'; // Or your function's region
    const functionName = 'ext-firestore-stripe-payments-createCheckoutSession';
    const functionUrl = `https://${location}-${projectId}.cloudfunctions.net/${functionName}`;

    try {
      // Get an authenticated client that can invoke the private Cloud Function.
      const auth = getAuth();
      const client = await auth.getIdTokenClient(functionUrl);

      // The body of the request must match what the Stripe extension function expects.
      const body = {
        line_items: input.line_items,
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        allow_promotion_codes: !!input.promoCode,
        uid: input.uid,
        mode: 'subscription', // Important for recurring payments
      };

      const response = await client.request({
        url: functionUrl,
        method: 'POST',
        data: body,
      });
      
      const responseData = response.data as any;

      if (responseData.error) {
        return { error: responseData.error.message };
      }
      if (!responseData.url) {
        throw new Error('Invalid response from checkout session function.');
      }
      
      return { url: responseData.url };

    } catch (e: any) {
      console.error('Error invoking createCheckoutSession function:', e.response?.data || e.message);
      return {
        error: e.response?.data?.error?.message || 'Failed to create checkout session. Check server logs.',
      };
    }
  }
);
