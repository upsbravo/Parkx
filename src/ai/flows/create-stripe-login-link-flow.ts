
'use server';
/**
 * @fileOverview A server-side flow to securely create a Stripe login link for a Connected Account.
 *
 * - createStripeLoginLink - Creates a one-time login link for the Express Dashboard.
 * - CreateStripeLoginLinkInput - The input type for the function.
 * - CreateStripeLoginLinkOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const CreateStripeLoginLinkInputSchema = z.object({
  stripeAccountId: z.string().describe("The ID of the Stripe Connected Account to generate a link for."),
});
export type CreateStripeLoginLinkInput = z.infer<typeof CreateStripeLoginLinkInputSchema>;

const CreateStripeLoginLinkOutputSchema = z.object({
  url: z.string().url().optional().describe('The URL for the Stripe Express Dashboard login session.'),
  error: z.string().optional().describe('An error message if the link creation failed.'),
});
export type CreateStripeLoginLinkOutput = z.infer<typeof CreateStripeLoginLinkOutputSchema>;

export async function createStripeLoginLink(
  input: CreateStripeLoginLinkInput
): Promise<CreateStripeLoginLinkOutput> {
  return createStripeLoginLinkFlow(input);
}

const createStripeLoginLinkFlow = ai.defineFlow(
  {
    name: 'createStripeLoginLinkFlow',
    inputSchema: CreateStripeLoginLinkInputSchema,
    outputSchema: CreateStripeLoginLinkOutputSchema,
  },
  async ({ stripeAccountId }) => {
    if (!process.env.STRIPE_SECRET_KEY) {
        return { error: "Stripe is not configured on the server." };
    }

    try {
        const { default: Stripe } = await import('stripe');
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

        const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);
        
        return { url: loginLink.url };

    } catch (e: any) {
      console.error('Error creating Stripe login link:', e);
      return {
        error: e.message || 'An unexpected error occurred while creating the login link.',
      };
    }
  }
);
