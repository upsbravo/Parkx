
'use server';
/**
 * @fileOverview A server-side flow to securely create a Stripe Express Connected Account.
 *
 * - createStripeAccount - Creates a new Connect account for a vendor.
 * - CreateStripeAccountInput - The input type for the function.
 * - CreateStripeAccountOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const CreateStripeAccountInputSchema = z.object({
  email: z.string().email().describe("The vendor's email address."),
  uid: z.string().describe("The vendor's Firebase UID, to be used as the account ID."),
});
export type CreateStripeAccountInput = z.infer<typeof CreateStripeAccountInputSchema>;

const CreateStripeAccountOutputSchema = z.object({
  accountId: z.string().optional().describe('The ID of the newly created Stripe Connected Account.'),
  error: z.string().optional().describe('An error message if the creation failed.'),
});
export type CreateStripeAccountOutput = z.infer<typeof CreateStripeAccountOutputSchema>;

export async function createStripeAccount(
  input: CreateStripeAccountInput
): Promise<CreateStripeAccountOutput> {
  return createStripeAccountFlow(input);
}

const createStripeAccountFlow = ai.defineFlow(
  {
    name: 'createStripeAccountFlow',
    inputSchema: CreateStripeAccountInputSchema,
    outputSchema: CreateStripeAccountOutputSchema,
  },
  async ({ email, uid }) => {
    if (!process.env.STRIPE_SECRET_KEY) {
      return { error: 'Stripe secret key is not configured on the server.' };
    }

    try {
      const { default: Stripe } = await import('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

      // Create a Connect Express account
      const account = await stripe.accounts.create({
        type: 'express',
        email: email,
        // The Firebase UID is used as a reference to link the Stripe account to our vendor
        metadata: {
          firebase_uid: uid,
        },
        capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
        },
      });

      return { accountId: account.id };
    } catch (e: any) {
      console.error('Error creating Stripe connected account:', e);
      return {
        error: e.message || 'An unexpected error occurred while creating the Stripe account.',
      };
    }
  }
);
