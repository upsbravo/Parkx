
'use server';
/**
 * @fileOverview A server-side flow to securely pause a Stripe subscription.
 *
 * - pauseStripeSubscription - A function that pauses a subscription in Stripe.
 * - PauseStripeSubscriptionInput - The input type for the function.
 * - PauseStripeSubscriptionOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const PauseStripeSubscriptionInputSchema = z.object({
  subscriptionId: z.string().describe("The ID of the Stripe Subscription object to pause."),
});
export type PauseStripeSubscriptionInput = z.infer<typeof PauseStripeSubscriptionInputSchema>;

const PauseStripeSubscriptionOutputSchema = z.object({
  success: z.boolean(),
  error: z.string().optional().describe('An error message if pausing failed.'),
});
export type PauseStripeSubscriptionOutput = z.infer<typeof PauseStripeSubscriptionOutputSchema>;

export async function pauseStripeSubscription(
  input: PauseStripeSubscriptionInput
): Promise<PauseStripeSubscriptionOutput> {
  return pauseStripeSubscriptionFlow(input);
}

const pauseStripeSubscriptionFlow = ai.defineFlow(
  {
    name: 'pauseStripeSubscriptionFlow',
    inputSchema: PauseStripeSubscriptionInputSchema,
    outputSchema: PauseStripeSubscriptionOutputSchema,
  },
  async ({ subscriptionId }) => {
    if (!process.env.STRIPE_SECRET_KEY) {
      return { success: false, error: 'Stripe is not configured.' };
    }

    try {
      const { default: Stripe } = await import('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

      await stripe.subscriptions.update(subscriptionId, {
        pause_collection: {
          behavior: 'void', // Voids the current invoice and stops creating new ones.
        },
      });

      return { success: true };
    } catch (e: any) {
      console.error('Error pausing Stripe subscription:', e);
      return {
        success: false,
        error: e.message || 'An unexpected error occurred.',
      };
    }
  }
);

    