
'use server';
/**
 * @fileOverview A server-side flow to securely delete a Stripe Connected Account.
 *
 * - deleteStripeAccount - Deletes a Connect account from Stripe.
 * - DeleteStripeAccountInput - The input type for the function.
 * - DeleteStripeAccountOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const DeleteStripeAccountInputSchema = z.object({
  stripeAccountId: z.string().describe("The ID of the Stripe Connected Account to delete."),
});
export type DeleteStripeAccountInput = z.infer<typeof DeleteStripeAccountInputSchema>;

const DeleteStripeAccountOutputSchema = z.object({
  success: z.boolean(),
  error: z.string().optional().describe('An error message if the deletion failed.'),
});
export type DeleteStripeAccountOutput = z.infer<typeof DeleteStripeAccountOutputSchema>;

export async function deleteStripeAccount(
  input: DeleteStripeAccountInput
): Promise<DeleteStripeAccountOutput> {
  return deleteStripeAccountFlow(input);
}

const deleteStripeAccountFlow = ai.defineFlow(
  {
    name: 'deleteStripeAccountFlow',
    inputSchema: DeleteStripeAccountInputSchema,
    outputSchema: DeleteStripeAccountOutputSchema,
  },
  async ({ stripeAccountId }) => {
    if (!process.env.STRIPE_SECRET_KEY) {
      return { success: false, error: 'Stripe secret key is not configured on the server.' };
    }

    try {
      const { default: Stripe } = await import('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

      await stripe.accounts.del(stripeAccountId);

      return { success: true };
    } catch (e: any) {
      console.error('Error deleting Stripe connected account:', e);
      return {
        success: false,
        error: e.message || 'An unexpected error occurred while deleting the Stripe account.',
      };
    }
  }
);
