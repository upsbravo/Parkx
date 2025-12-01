
'use server';
/**
 * @fileOverview A server-side flow to securely update a Stripe Customer object.
 *
 * - updateStripeCustomer - Updates a customer's details in Stripe.
 * - UpdateStripeCustomerInput - The input type for the function.
 * - UpdateStripeCustomerOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const UpdateStripeCustomerInputSchema = z.object({
  customerId: z.string().describe("The ID of the Stripe Customer object to update."),
  email: z.string().email().optional().describe("The customer's new email address."),
  name: z.string().optional().describe("The customer's new full name."),
});
export type UpdateStripeCustomerInput = z.infer<typeof UpdateStripeCustomerInputSchema>;

const UpdateStripeCustomerOutputSchema = z.object({
  success: z.boolean(),
  error: z.string().optional().describe('An error message if the update failed.'),
});
export type UpdateStripeCustomerOutput = z.infer<typeof UpdateStripeCustomerOutputSchema>;

export async function updateStripeCustomer(
  input: UpdateStripeCustomerInput
): Promise<UpdateStripeCustomerOutput> {
  return updateStripeCustomerFlow(input);
}

const updateStripeCustomerFlow = ai.defineFlow(
  {
    name: 'updateStripeCustomerFlow',
    inputSchema: UpdateStripeCustomerInputSchema,
    outputSchema: UpdateStripeCustomerOutputSchema,
  },
  async ({ customerId, email, name }) => {
    if (!process.env.STRIPE_SECRET_KEY) {
      return { success: false, error: 'Stripe secret key is not configured on the server.' };
    }

    try {
      const { default: Stripe } = await import('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

      const updateData: { email?: string; name?: string } = {};
      if (email) updateData.email = email;
      if (name) updateData.name = name;

      if (Object.keys(updateData).length === 0) {
        return { success: true }; // Nothing to update
      }

      await stripe.customers.update(customerId, updateData);

      return { success: true };
    } catch (e: any) {
      console.error('Error updating Stripe customer:', e);
      return {
        success: false,
        error: e.message || 'An unexpected error occurred while updating the Stripe customer.',
      };
    }
  }
);
