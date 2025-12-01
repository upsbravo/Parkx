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
  async ({ customerId, returnUrl }) => {
    // This server-side logic is now correctly placed inside the Genkit flow.
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY environment variable not set.');
      return {
        error: 'The application is not configured for payments. Please contact support.',
      };
    }
    
    try {
      const { default: Stripe } = await import('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      if (!portalSession.url) {
        throw new Error('Stripe did not return a portal session URL.');
      }
      
      return { url: portalSession.url };

    } catch (e: any) {
      console.error('Error creating Stripe billing portal session:', e);
      return {
        error: e.message || 'Failed to create customer portal session. Check server logs.',
      };
    }
  }
);
