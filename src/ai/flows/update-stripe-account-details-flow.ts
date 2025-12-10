'use server';
/**
 * @fileOverview A server-side flow to securely update details of a Stripe Connected Account.
 *
 * - updateStripeAccountDetails - A function that updates settings in Stripe.
 * - UpdateStripeAccountDetailsInput - The input type for the function.
 * - UpdateStripeAccountDetailsOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const UpdateStripeAccountDetailsInputSchema = z.object({
  stripeAccountId: z.string().describe("The ID of the Stripe Connected Account to update."),
  statementDescriptor: z.string().min(5).max(22).optional().describe("The text that appears on the customer's credit card statement."),
});
export type UpdateStripeAccountDetailsInput = z.infer<typeof UpdateStripeAccountDetailsInputSchema>;

const UpdateStripeAccountDetailsOutputSchema = z.object({
  success: z.boolean(),
  error: z.string().optional().describe('An error message if the update failed.'),
});
export type UpdateStripeAccountDetailsOutput = z.infer<typeof UpdateStripeAccountDetailsOutputSchema>;

export async function updateStripeAccountDetails(
  input: UpdateStripeAccountDetailsInput
): Promise<UpdateStripeAccountDetailsOutput> {
  return updateStripeAccountDetailsFlow(input);
}

const updateStripeAccountDetailsFlow = ai.defineFlow(
  {
    name: 'updateStripeAccountDetailsFlow',
    inputSchema: UpdateStripeAccountDetailsInputSchema,
    outputSchema: UpdateStripeAccountDetailsOutputSchema,
  },
  async ({ stripeAccountId, statementDescriptor }) => {
    if (!process.env.STRIPE_SECRET_KEY) {
      return { success: false, error: 'Stripe secret key is not configured on the server.' };
    }

    try {
      const { default: Stripe } = await import('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

      const updatePayload: Stripe.AccountUpdateParams = {
        settings: {
          payments: {
            statement_descriptor: statementDescriptor,
          },
        },
      };

      await stripe.accounts.update(stripeAccountId, updatePayload);

      return { success: true };
    } catch (e: any) {
      console.error('Error updating Stripe account details:', e);
      return {
        success: false,
        error: e.message || 'An unexpected error occurred while updating the Stripe account.',
      };
    }
  }
);
