
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
  priceId: z.string().optional().describe("The ID of the Price object for the subscription item to update. This is for the 'additional spots' product."),
  quantity: z.number().int().min(0).optional().describe("The new quantity for the 'additional spots' item."),
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

      const updatePayload: Stripe.SubscriptionUpdateParams = {};

      if (endTrial) {
        updatePayload.trial_end = 'now';
      }

      if (typeof quantity === 'number' && priceId) {
        // Retrieve the current subscription to get all its items.
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        
        // Find the existing item for additional spots, if it exists.
        const existingItem = subscription.items.data.find(item => item.price.id === priceId);

        // Prepare the items array for the update call.
        // We must include all items we want to keep.
        const items: Stripe.SubscriptionUpdateParams.Item[] = subscription.items.data
          .filter(item => item.price.id !== priceId) // Keep all items except the one we're managing
          .map(item => ({ id: item.id })); // Map them to the format Stripe expects

        if (quantity > 0) {
          // If we need additional spots, we either update the existing item or add a new one.
          if (existingItem) {
            items.push({ id: existingItem.id, quantity: quantity });
          } else {
            items.push({ price: priceId, quantity: quantity });
          }
        } else if (existingItem) {
          // If quantity is 0 and the item exists, we mark it for deletion.
          items.push({ id: existingItem.id, deleted: true });
        }
        
        updatePayload.items = items;
        // This setting ensures that if a trial is active and we add a new item,
        // it doesn't immediately create a prorated charge. The new item will be billed
        // at the end of the trial.
        updatePayload.proration_behavior = 'none';
      }
      
      // If there's anything to update, make the API call.
      if (Object.keys(updatePayload).length > 0) {
        await stripe.subscriptions.update(subscriptionId, updatePayload);
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
