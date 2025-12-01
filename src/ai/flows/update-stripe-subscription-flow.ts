'use server';
/**
 * @fileOverview A server-side flow to securely update a Stripe subscription,
 * specifically for changing the quantity of a subscription item.
 *
 * - updateStripeSubscription - A function that updates an item's quantity in a Stripe subscription.
 * - UpdateStripeSubscriptionInput - The input type for the function.
 * - UpdateStripeSubscriptionOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const UpdateStripeSubscriptionInputSchema = z.object({
  subscriptionId: z.string().describe("The ID of the Stripe Subscription to update."),
  priceId: z.string().describe("The ID of the Price object for the subscription item to update."),
  quantity: z.number().int().min(0).describe("The new quantity for the subscription item."),
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
  async ({ subscriptionId, priceId, quantity }) => {
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

      // 1. Retrieve the subscription to find the relevant subscription item
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      
      const itemToUpdate = subscription.items.data.find(item => item.price.id === priceId);

      if (!itemToUpdate) {
        // If the item doesn't exist, we might need to add it.
        // For this use case (adjusting extra spots), we assume the item for extra spots is created
        // with a quantity of 0 during initial subscription if the user has more than 20 spots.
        // A more robust solution might create the item here if not found.
        
        // For now, let's try creating it if it doesn't exist
         await stripe.subscriptionItems.create({
            subscription: subscriptionId,
            price: priceId,
            quantity: quantity,
        });

      } else {
        // 2. Update the quantity of that subscription item
        await stripe.subscriptionItems.update(itemToUpdate.id, {
            quantity: quantity,
        });
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
