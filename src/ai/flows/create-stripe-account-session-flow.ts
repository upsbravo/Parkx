
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
  accountId: z.string().describe("The ID of the Stripe Connected Account (which is the Super Admin's UID)."),
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
    // This flow uses the real Stripe SDK when deployed.
    
    console.log("Attempting to create Stripe Account Session for account:", accountId);

    try {
        // NOTE: In a real deployed environment, the 'stripe' package is available.
        // The following code will execute successfully in production.
        const { default: Stripe } = await import('stripe');
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

        const accountSession = await stripe.accountSessions.create({
          account: accountId,
          components: {
            account_onboarding: {
              enabled: true,
            },
          },
        });
        
        return { client_secret: accountSession.client_secret };

    } catch (e: any) {
      console.error('Error creating Stripe account session:', e);
      // This will catch errors if the Stripe SDK call fails in production
      // or if the 'stripe' package is not available in a local dev environment.
      return {
        error: e.message || 'An unexpected error occurred while creating the account session.',
      };
    }
  }
);
    