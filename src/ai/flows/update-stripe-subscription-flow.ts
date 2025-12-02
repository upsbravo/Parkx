'use server';
/**
 * @fileOverview A server-side flow to securely update a Stripe subscription,
 * specifically for changing the quantity of a subscription item or ending a trial.
 *
 * - updateStripeSubscription - A function that updates an item's quantity or ends a trial in a Stripe subscription.
 * - UpdateStripeSubscriptionInput - The input type for the function.
 * - UpdateStripeSubscriptionOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const UpdateStripeSubscriptionInputSchema = z.object({
  subscriptionId: z.string().describe("The ID of the Stripe Subscription to update."),
  priceId: z.string().optional().describe("The ID of the Price object for the subscription item to update."),
  quantity: z.number().int().min(0).optional().describe("The new quantity for the subscription item."),
  endTrial: z.boolean().optional().describe("Set to true to end the subscription's trial immediately."),
});
export type UpdateStripeSubscriptionInput = z.infer<typeof UpdateStripeSubscriptionInputSchema>;

const UpdateStripeSubscriptionOutputSchema = z.object({
  success: z.boolean(),
  error: z.string().optional().describe('An error message if the update failed.'),
});
export type UpdateStripeSubscriptionOutput = z.infer<typeof UpdateStripeSubscriptionOutputSchema>;

// This function is exported and can be called from the client.
export async function updateStripeSubscription(
  input: UpdateStripeSubscriptionInput
): Promise<UpdateStripeSubscriptionOutput> {
  return updateStripeSubscriptionFlow(input);
}

const updateStripeSubscriptionFlow = ai.defineFlow(
  {
    name: 'updateStripeSubscriptionFlow',
    inputSchema: UpdateStripeSubscriptionInputSchema,
    outputSchema: UpdateStripeSubscriptionOutputSchema,
  },
  async ({ subscriptionId, priceId, quantity, endTrial }) => {
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

      // If ending trial, update the subscription directly.
      if (endTrial) {
        await stripe.subscriptions.update(subscriptionId, {
          trial_end: 'now',
        });
      }

      // If updating quantity, handle the subscription item logic.
      if (typeof quantity === 'number' && priceId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const itemToUpdate = subscription.items.data.find(item => item.price.id === priceId);

        if (!itemToUpdate) {
          if (quantity > 0) {
            await stripe.subscriptionItems.create({
              subscription: subscriptionId,
              price: priceId,
              quantity: quantity,
            });
          }
        } else {
          await stripe.subscriptionItems.update(itemToUpdate.id, {
            quantity: quantity,
          });
        }
      }

      return { success: true };

    } catch (e: any) {
      console.error('Error updating Stripe subscription:', e);
      return {
        success: false,
        error: e.message || 'An unexpected error occurred while updating the subscription.',
      };
    }
  }
);
