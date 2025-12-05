
'use server';
/**
 * @fileOverview A server-side flow to securely create a Stripe Account Session for Connect Onboarding.
 *
 * - createStripeAccountSession - Creates a session for an embedded onboarding experience.
 * - CreateStripeAccountSessionInput - The input type for the function.
 * - CreateStripeAccountSessionOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const CreateStripeAccountSessionInputSchema = z.object({
  accountId: z.string().describe("The ID of the Stripe Connected Account."),
});
export type CreateStripeAccountSessionInput = z.infer<typeof CreateStripeAccountSessionInputSchema>;

const CreateStripeAccountSessionOutputSchema = z.object({
  client_secret: z.string().optional().describe('The client secret for the account session.'),
  error: z.string().optional().describe('An error message if the session creation failed.'),
});
export type CreateStripeAccountSessionOutput = z.infer<typeof CreateStripeAccountSessionOutputSchema>;

export async function createStripeAccountSession(
  input: CreateStripeAccountSessionInput
): Promise<CreateStripeAccountSessionOutput> {
  return createStripeAccountSessionFlow(input);
}

const createStripeAccountSessionFlow = ai.defineFlow(
  {
    name: 'createStripeAccountSessionFlow',
    inputSchema: CreateStripeAccountSessionInputSchema,
    outputSchema: CreateStripeAccountSessionOutputSchema,
  },
  async ({ accountId }) => {
    if (!process.env.STRIPE_SECRET_KEY) {
        return { error: "Stripe is not configured on the server." };
    }

    try {
        const { default: Stripe } = await import('stripe');
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

        const accountSession = await stripe.accountSessions.create({
          account: accountId,
          components: {
            account_onboarding: {
              enabled: true,
            },
            payments: {
                enabled: true,
            },
            payouts: {
                enabled: true,
            }
          },
        });
        
        return { client_secret: accountSession.client_secret };

    } catch (e: any) {
      console.error('Error creating Stripe account session:', e);
      return {
        error: e.message || 'An unexpected error occurred while creating the account session.',
      };
    }
  }
);
    
