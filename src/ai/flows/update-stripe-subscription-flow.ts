
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
  quantity: z.number().int().min(0).optional().describe("The new quantity for the 'additional spots' item."),
  endTrial: z.boolean().optional().describe("Set to true to end the subscription's trial immediately."),
});
export type UpdateStripeSubscriptionInput = z.infer<typeof UpdateStripeSubscriptionInputSchema>;

const UpdateStripeSubscriptionOutputSchema = z.object({
  success: z.boolean(),
  upcomingAmount: z.number().optional().describe("The calculated amount of the next invoice after changes, in dollars."),
  error: z.string().optional().describe('An error message if the update failed.'),
});
export type UpdateStripeSubscriptionOutput = z.infer<typeof UpdateStripeSubscriptionOutputSchema>;

// This MUST correspond to a real Price ID in your Stripe account for the "Additional Spot" product.
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

      // 1. Retrieve the current subscription to get its items and status.
      // Use the correct 'sub_...' ID here.
      const subscription = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['items'] });
      
      const updatePayload: Stripe.SubscriptionUpdateParams = {};

      // Logic to end a trial immediately.
      if (endTrial) {
        updatePayload.trial_end = 'now';
      }

      // Logic for updating the quantity of the 'additional spots' item.
      if (typeof quantity === 'number') {
        // 2. Find the existing 'additional spots' item on the subscription. This is a SubscriptionItem (`si_...`)
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
                // If the item exists, we update its quantity by passing its SubscriptionItem ID (`si_...`).
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
        
        // CRITICAL FIX FOR TRIAL PERIOD:
        // When updating a subscription in trial, we must explicitly preserve the trial end
        // and set the proration behavior to 'none' to ensure the changes are reflected
        // in the upcoming post-trial invoice without an immediate charge.
        if (subscription.status === 'trialing' && !endTrial) {
            updatePayload.proration_behavior = 'none';
            if (subscription.trial_end) {
              updatePayload.trial_end = subscription.trial_end;
            }
        }
      }
      
      // If there's anything to update, make the API call.
      if (Object.keys(updatePayload).length > 0) {
        await stripe.subscriptions.update(subscriptionId, updatePayload);
      }
      
      // Verification Step: Preview the upcoming invoice to confirm the new total.
      let upcomingAmount: number | undefined = undefined;
      try {
          const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
              subscription: subscriptionId,
              customer: subscription.customer as string,
          });
          upcomingAmount = upcomingInvoice.amount_due / 100; // convert cents to dollars
          console.log(`SUCCESS: Post-trial preview for sub ${subscriptionId} is $${upcomingAmount}`);
      } catch (previewErr: any) {
          console.error(`Preview failed (non-blocking, update may have succeeded): ${previewErr.message}`);
      }

      return { success: true, upcomingAmount };

    } catch (e: any) {
      console.error('Error updating Stripe subscription:', e);
      return {
        success: false,
        error: e.message || 'An unexpected error occurred while updating the subscription.',
      };
    }
  }
);
