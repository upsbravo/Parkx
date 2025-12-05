'use server';
/**
 * @fileOverview A server-side flow to securely create a Stripe Account Link for Connect Onboarding.
 *
 * - createStripeAccountLink - Creates a one-time link for a vendor to onboard with Stripe.
 * - CreateStripeAccountLinkInput - The input type for the function.
 * - CreateStripeAccountLinkOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const CreateStripeAccountLinkInputSchema = z.object({
  accountId: z.string().describe("The ID of the Stripe Connected Account."),
  refreshUrl: z.string().url().describe("The URL the user will be redirected to if the link is expired, invalid, or used previously."),
  returnUrl: z.string().url().describe("The URL the user will be redirected to after completing the onboarding flow."),
});
export type CreateStripeAccountLinkInput = z.infer<typeof CreateStripeAccountLinkInputSchema>;

const CreateStripeAccountLinkOutputSchema = z.object({
  url: z.string().url().optional().describe('The URL for the Stripe Account Link session.'),
  error: z.string().optional().describe('An error message if the session creation failed.'),
});
export type CreateStripeAccountLinkOutput = z.infer<typeof CreateStripeAccountLinkOutputSchema>;

export async function createStripeAccountLink(
  input: CreateStripeAccountLinkInput
): Promise<CreateStripeAccountLinkOutput> {
  return createStripeAccountLinkFlow(input);
}

const createStripeAccountLinkFlow = ai.defineFlow(
  {
    name: 'createStripeAccountLinkFlow',
    inputSchema: CreateStripeAccountLinkInputSchema,
    outputSchema: CreateStripeAccountLinkOutputSchema,
  },
  async ({ accountId, refreshUrl, returnUrl }) => {
    if (!process.env.STRIPE_SECRET_KEY) {
        return { error: "Stripe is not configured on the server." };
    }

    try {
        const { default: Stripe } = await import('stripe');
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

        const accountLink = await stripe.accountLinks.create({
          account: accountId,
          refresh_url: refreshUrl,
          return_url: returnUrl,
          type: 'account_onboarding',
        });
        
        return { url: accountLink.url };

    } catch (e: any) {
      console.error('Error creating Stripe account link:', e);
      return {
        error: e.message || 'An unexpected error occurred while creating the account link.',
      };
    }
  }
);
