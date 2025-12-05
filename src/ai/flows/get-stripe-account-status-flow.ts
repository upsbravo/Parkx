'use server';
/**
 * @fileOverview A server-side flow to retrieve the status of a Stripe Connected Account.
 *
 * - getStripeAccountStatus - Fetches the account status from Stripe.
 * - GetStripeAccountStatusInput - The input type for the function.
 * - GetStripeAccountStatusOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GetStripeAccountStatusInputSchema = z.object({
  stripeAccountId: z.string().describe("The ID of the Stripe Connected Account."),
});
export type GetStripeAccountStatusInput = z.infer<typeof GetStripeAccountStatusInputSchema>;

const GetStripeAccountStatusOutputSchema = z.object({
  payouts_enabled: z.boolean().describe("Indicates if payouts are enabled for the account."),
  charges_enabled: z.boolean().describe("Indicates if charges are enabled for the account."),
  details_submitted: z.boolean().describe("Indicates if the account has submitted all required details."),
  error: z.string().optional().describe('An error message if fetching the status failed.'),
});
export type GetStripeAccountStatusOutput = z.infer<typeof GetStripeAccountStatusOutputSchema>;

export async function getStripeAccountStatus(
  input: GetStripeAccountStatusInput
): Promise<GetStripeAccountStatusOutput> {
  return getStripeAccountStatusFlow(input);
}

const getStripeAccountStatusFlow = ai.defineFlow(
  {
    name: 'getStripeAccountStatusFlow',
    inputSchema: GetStripeAccountStatusInputSchema,
    outputSchema: GetStripeAccountStatusOutputSchema,
  },
  async ({ stripeAccountId }) => {
    if (!process.env.STRIPE_SECRET_KEY) {
      return {
        payouts_enabled: false,
        charges_enabled: false,
        details_submitted: false,
        error: 'Stripe is not configured on the server.',
      };
    }

    try {
      const { default: Stripe } = await import('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

      const account = await stripe.accounts.retrieve(stripeAccountId);

      return {
        payouts_enabled: account.payouts_enabled,
        charges_enabled: account.charges_enabled,
        details_submitted: account.details_submitted,
      };
    } catch (e: any) {
      console.error('Error fetching Stripe account status:', e);
      return {
        payouts_enabled: false,
        charges_enabled: false,
        details_submitted: false,
        error: e.message || 'An unexpected error occurred while fetching the account status.',
      };
    }
  }
);
