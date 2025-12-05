
'use server';
/**
 * @fileOverview A server-side flow to securely resume a paused Stripe subscription.
 *
 * - resumeStripeSubscription - A function that resumes a subscription in Stripe.
 * - ResumeStripeSubscriptionInput - The input type for the function.
 * - ResumeStripeSubscriptionOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ResumeStripeSubscriptionInputSchema = z.object({
  subscriptionId: z.string().describe("The ID of the Stripe Subscription object to resume."),
});
export type ResumeStripeSubscriptionInput = z.infer<typeof ResumeStripeSubscriptionInputSchema>;

const ResumeStripeSubscriptionOutputSchema = z.object({
  success: z.boolean(),
  error: z.string().optional().describe('An error message if resuming failed.'),
});
export type ResumeStripeSubscriptionOutput = z.infer<typeof ResumeStripeSubscriptionOutputSchema>;

export async function resumeStripeSubscription(
  input: ResumeStripeSubscriptionInput
): Promise<ResumeStripeSubscriptionOutput> {
  return resumeStripeSubscriptionFlow(input);
}

const resumeStripeSubscriptionFlow = ai.defineFlow(
  {
    name: 'resumeStripeSubscriptionFlow',
    inputSchema: ResumeStripeSubscriptionInputSchema,
    outputSchema: ResumeStripeSubscriptionOutputSchema,
  },
  async ({ subscriptionId }) => {
    if (!process.env.STRIPE_SECRET_KEY) {
      return { success: false, error: 'Stripe is not configured.' };
    }

    try {
      const { default: Stripe } = await import('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

      await stripe.subscriptions.update(subscriptionId, {
        pause_collection: null, // Setting to null resumes the subscription.
      });

      return { success: true };
    } catch (e: any) {
      console.error('Error resuming Stripe subscription:', e);
      return {
        success: false,
        error: e.message || 'An unexpected error occurred.',
      };
    }
  }
);

    
