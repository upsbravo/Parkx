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
import { getAuth } from 'google-auth-library';
import { useUser } from '@/firebase';


const CreateStripeCheckoutInputSchema = z.object({
  priceId: z.string().describe('The ID of the Stripe price object.'),
  successUrl: z.string().url().describe('The URL to redirect to on success.'),
  cancelUrl: z.string().url().describe('The URL to redirect to on cancellation.'),
  promoCode: z.string().optional().describe('An optional promotion code.'),
});
export type CreateStripeCheckoutInput = z.infer<typeof CreateStripeCheckoutInputSchema>;

const CreateStripeCheckoutOutputSchema = z.object({
  url: z.string().url().describe('The URL for the Stripe Checkout session.'),
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
    const { user } = useUser();

    if (!process.env.GCLOUD_PROJECT) {
      throw new Error('GCLOUD_PROJECT environment variable not set.');
    }
    if (!user) {
      throw new Error('User must be authenticated to create a checkout session.');
    }

    // These should match your Firebase project details and function names.
    const projectId = process.env.GCLOUD_PROJECT;
    const location = 'us-central1';
    const functionName = 'ext-firestore-stripe-payments-createCheckoutSession';
    const functionUrl = `https://${location}-${projectId}.cloudfunctions.net/${functionName}`;

    try {
      // Get an authenticated client that can invoke the private Cloud Function.
      const auth = getAuth();
      const client = await auth.getIdTokenClient(functionUrl);

      // The body of the request must match what the Stripe extension function expects.
      // We pass the currently authenticated user's UID to associate the checkout with them.
      const body = {
        data: {
          price: input.priceId,
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
          allow_promotion_codes: !!input.promoCode,
          uid: user.uid,
        },
      };

      const response = await client.request({
        url: functionUrl,
        method: 'POST',
        data: body,
      });
      
      const responseData = response.data as any;

      if (responseData.data.error) {
        return { url: '', error: responseData.data.error.message };
      }
      if (!responseData.data.url) {
        throw new Error('Invalid response from checkout session function.');
      }
      
      return { url: responseData.data.url };

    } catch (e: any) {
      console.error('Error invoking createCheckoutSession function:', e.response?.data || e.message);
      return {
        url: '',
        error: e.response?.data?.error?.message || 'Failed to create checkout session.',
      };
    }
  }
);
