
'use server';
/**
 * @fileOverview A server-side flow to securely update a Stripe subscription,
 * specifically for changing the quantity of a subscription item or ending a trial.
 * This version contains the definitive fix for updating items during a trial period.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type Stripe from 'stripe';

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

// Price ID for the additional spots product.
const ADDITIONAL_SPOT_PRICE_ID = 'price_1SYZeTFOrzQHr7Jw6MFDflI4';


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
  async ({ subscriptionId, quantity, endTrial }) => {
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
      
      // Logic to end a trial immediately.
      if (endTrial) {
        updatePayload.trial_end = 'now';
      }

      // Logic for updating the quantity of the 'additional spots' item.
      if (typeof quantity === 'number') {
        // 1. Retrieve the current subscription to get its items.
        const subscription = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['items'] });
        
        // 2. Find the existing 'additional spots' item on the subscription.
        const existingSpotItem = subscription.items.data.find(item => item.price.id === ADDITIONAL_SPOT_PRICE_ID);
        
        const items: Stripe.SubscriptionUpdateParams.Item[] = [];

        // 3. Preserve all other existing subscription items that we are not touching.
        subscription.items.data.forEach(item => {
            if (item.price.id !== ADDITIONAL_SPOT_PRICE_ID) {
                items.push({ id: item.id, quantity: item.quantity });
            }
        });

        // 4. Handle the 'additional spots' item based on the new quantity.
        if (quantity > 0) {
            if (existingSpotItem) {
                // If the item exists, we update its quantity by passing its ID.
                items.push({ id: existingSpotItem.id, quantity: quantity });
            } else {
                // If it's a new item, we add it by passing the price ID.
                items.push({ price: ADDITIONAL_SPOT_PRICE_ID, quantity: quantity });
            }
        } else if (existingSpotItem) {
            // If quantity is 0 and the item exists, we mark it for deletion.
            items.push({ id: existingSpotItem.id, deleted: true });
        }
        
        updatePayload.items = items;
        
        // 5. When updating items during a trial, Stripe recommends setting proration_behavior to 'none'
        // to avoid immediate charges and ensure the next invoice is correct.
        if (subscription.status === 'trialing') {
          updatePayload.proration_behavior = 'none';
        }
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
