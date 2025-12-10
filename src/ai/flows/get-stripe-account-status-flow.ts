'use server';
/**
 * @fileOverview A server-side flow to retrieve details of a Stripe Connected Account.
 *
 * - getStripeAccountDetails - Fetches the account details from Stripe.
 * - GetStripeAccountDetailsInput - The input type for the function.
 * - GetStripeAccountDetailsOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GetStripeAccountDetailsInputSchema = z.object({
  stripeAccountId: z.string().describe("The ID of the Stripe Connected Account."),
});
export type GetStripeAccountDetailsInput = z.infer<typeof GetStripeAccountDetailsInputSchema>;

const GetStripeAccountDetailsOutputSchema = z.object({
  payouts_enabled: z.boolean().describe("Indicates if payouts are enabled for the account."),
  charges_enabled: z.boolean().describe("Indicates if charges are enabled for the account."),
  details_submitted: z.boolean().describe("Indicates if the account has submitted all required details."),
  statement_descriptor: z.string().nullable().optional().describe('The current statement descriptor for the account.'),
  error: z.string().optional().describe('An error message if fetching the status failed.'),
});
export type GetStripeAccountDetailsOutput = z.infer<typeof GetStripeAccountDetailsOutputSchema>;

export async function getStripeAccountDetails(
  input: GetStripeAccountDetailsInput
): Promise<GetStripeAccountDetailsOutput> {
  return getStripeAccountDetailsFlow(input);
}

const getStripeAccountDetailsFlow = ai.defineFlow(
  {
    name: 'getStripeAccountDetailsFlow',
    inputSchema: GetStripeAccountDetailsInputSchema,
    outputSchema: GetStripeAccountDetailsOutputSchema,
  },
  async ({ stripeAccountId }) => {
    if (!process.env.STRIPE_SECRET_KEY) {
      return {
        payouts_enabled: false,
        charges_enabled: false,
        details_submitted: false,
        statement_descriptor: null,
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
        statement_descriptor: account.settings?.payments?.statement_descriptor || null,
      };
    } catch (e: any) {
      console.error('Error fetching Stripe account details:', e);
      return {
        payouts_enabled: false,
        charges_enabled: false,
        details_submitted: false,
        statement_descriptor: null,
        error: e.message || 'An unexpected error occurred while fetching the account details.',
      };
    }
  }
);
