'use server';
/**
 * @fileOverview A server-side flow to securely create a Stripe Customer Portal session.
 *
 * - createStripePortalSession - A function that calls the Stripe extension's function to generate a portal link.
 * - CreateStripePortalSessionInput - The input type for the function.
 * - CreateStripePortalSessionOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const CreateStripePortalSessionInputSchema = z.object({
  customerId: z.string().describe("The ID of the Stripe Customer object."),
  returnUrl: z.string().url().describe("The URL to which the user will be returned after visiting the portal."),
});
export type CreateStripePortalSessionInput = z.infer<typeof CreateStripePortalSessionInputSchema>;

const CreateStripePortalSessionOutputSchema = z.object({
  url: z.string().url().optional().describe('The URL for the Stripe Customer Portal session.'),
  error: z.string().optional().describe('An error message if the session creation failed.'),
});
export type CreateStripePortalSessionOutput = z.infer<typeof CreateStripePortalSessionOutputSchema>;

// This function is exported and can be called from the client.
export async function createStripePortalSession(
  input: CreateStripePortalSessionInput
): Promise<CreateStripePortalSessionOutput> {
  return createStripePortalSessionFlow(input);
}

const createStripePortalSessionFlow = ai.defineFlow(
  {
    name: 'createStripePortalSessionFlow',
    inputSchema: CreateStripePortalSessionInputSchema,
    outputSchema: CreateStripePortalSessionOutputSchema,
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
    
    // These should match your Firebase project details and function names.
    const projectId = process.env.GCLOUD_PROJECT;
    const location = 'us-central1'; // Or your function's region
    const functionName = 'ext-firestore-stripe-payments-createPortalLink';
    const functionUrl = `https://${location}-${projectId}.cloudfunctions.net/${functionName}`;

    try {
      // Get an authenticated client that can invoke the private Cloud Function.
      const auth = getAuth();
      const client = await auth.getIdTokenClient(functionUrl);

      // The body of the request must match what the Stripe extension function expects.
      const body = {
        customer: input.customerId,
        return_url: input.returnUrl,
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
        throw new Error('Invalid response from create portal link function.');
      }
      
      return { url: responseData.url };

    } catch (e: any) {
      console.error('Error invoking createPortalLink function:', e.response?.data || e.message);
      return {
        error: e.response?.data?.error?.message || 'Failed to create customer portal session. Check server logs.',
      };
    }
  }
);
