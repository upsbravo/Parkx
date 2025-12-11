
'use server';
/**
 * @fileOverview A server-side flow to securely create a Stripe Customer object.
 *
 * - createStripeCustomer - Creates a new customer in Stripe.
 * - CreateStripeCustomerInput - The input type for the function.
 * - CreateStripeCustomerOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const CreateStripeCustomerInputSchema = z.object({
  email: z.string().email().describe("The customer's email address."),
  name: z.string().describe("The customer's full name."),
});
export type CreateStripeCustomerInput = z.infer<typeof CreateStripeCustomerInputSchema>;

const CreateStripeCustomerOutputSchema = z.object({
  customerId: z.string().optional().describe('The ID of the newly created Stripe Customer object.'),
  error: z.string().optional().describe('An error message if the creation failed.'),
});
export type CreateStripeCustomerOutput = z.infer<typeof CreateStripeCustomerOutputSchema>;

export async function createStripeCustomer(
  input: CreateStripeCustomerInput
): Promise<CreateStripeCustomerOutput> {
  return createStripeCustomerFlow(input);
}

const createStripeCustomerFlow = ai.defineFlow(
  {
    name: 'createStripeCustomerFlow',
    inputSchema: CreateStripeCustomerInputSchema,
    outputSchema: CreateStripeCustomerOutputSchema,
  },
  async ({ email, name }) => {
    if (!process.env.STRIPE_SECRET_KEY) {
      return { error: 'Stripe secret key is not configured on the server.' };
    }

    try {
      const { default: Stripe } = await import('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

      const customer = await stripe.customers.create({
        email,
        name,
        description: 'End-user on ParkX',
      });

      return { customerId: customer.id };
    } catch (e: any) {
      console.error('Error creating Stripe customer:', e);
      return {
        error: e.message || 'An unexpected error occurred while creating the Stripe customer.',
      };
    }
  }
);
