
'use server';
/**
 * @fileOverview A server-side flow to securely cancel a Stripe subscription.
 *
 * - cancelStripeSubscription - A function that cancels a subscription in Stripe.
 * - CancelStripeSubscriptionInput - The input type for the function.
 * - CancelStripeSubscriptionOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const CancelStripeSubscriptionInputSchema = z.object({
  subscriptionId: z.string().describe("The ID of the Stripe Subscription object to cancel."),
});
export type CancelStripeSubscriptionInput = z.infer<typeof CancelStripeSubscriptionInputSchema>;

const CancelStripeSubscriptionOutputSchema = z.object({
  success: z.boolean(),
  error: z.string().optional().describe('An error message if the cancellation failed.'),
});
export type CancelStripeSubscriptionOutput = z.infer<typeof CancelStripeSubscriptionOutputSchema>;

// This function is exported and can be called from the client.
export async function cancelStripeSubscription(
  input: CancelStripeSubscriptionInput
): Promise<CancelStripeSubscriptionOutput> {
  return cancelStripeSubscriptionFlow(input);
}

const cancelStripeSubscriptionFlow = ai.defineFlow(
  {
    name: 'cancelStripeSubscriptionFlow',
    inputSchema: CancelStripeSubscriptionInputSchema,
    outputSchema: CancelStripeSubscriptionOutputSchema,
  },
  async ({ subscriptionId }) => {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY environment variable not set.');
      return {
        success: false,
        error: 'The application is not configured for payments. Please contact support.',
      };
    }

    try {
      const { default: Stripe } = await import('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

      // The `stripe.subscriptions.del` function cancels the subscription.
      // By default, it prorates and creates an invoice for the final usage.
      // To cancel immediately without a final invoice, use `stripe.subscriptions.cancel`.
      // `del` is often preferred for usage-based billing. For simple subscriptions, `cancel` is also common.
      // We will use `del` which is equivalent to canceling at the end of the period by default.
      await stripe.subscriptions.del(subscriptionId);

      return { success: true };

    } catch (e: any) {
      console.error('Error canceling Stripe subscription:', e);
      return {
        success: false,
        error: e.message || 'An unexpected error occurred while canceling the subscription.',
      };
    }
  }
);
