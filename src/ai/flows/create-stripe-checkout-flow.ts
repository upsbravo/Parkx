
'use server';
/**
 * @fileOverview A server-side flow to securely create a Stripe Checkout session.
 * This flow uses the Stripe Node.js SDK directly to create sessions for subscriptions or one-time payments.
 *
 * - createStripeCheckout - A function that creates and returns a Stripe Checkout session URL.
 * - CreateStripeCheckoutInput - The input type for the function.
 * - CreateStripeCheckoutOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const LineItemSchema = z.object({
  price: z.string().optional().describe("The ID of the Stripe Price object."),
  quantity: z.number().int().min(1).describe("The quantity of the price object."),
  price_data: z.object({
      currency: z.string(),
      product_data: z.object({
          name: z.string(),
      }),
      unit_amount: z.number().int(),
      recurring: z.object({
        interval: z.enum(['month', 'year', 'week', 'day']),
        interval_count: z.number().int().optional(),
      }).optional(),
  }).optional(),
});

const CreateStripeCheckoutInputSchema = z.object({
  line_items: z.array(LineItemSchema).min(1).describe("An array of line items with pre-defined Price IDs or inline price data."),
  successUrl: z.string().url().describe('The URL to redirect to on success.'),
  cancelUrl: z.string().url().describe('The URL to redirect to on cancellation.'),
  customer: z.string().optional().describe("The Stripe customer ID. Can be optional if you collect it with the session."),
  mode: z.enum(['subscription', 'payment']).describe("The mode of the checkout session."),
  subscription_data: z.object({
    trial_period_days: z.number().int().optional().describe("Number of days for the trial period.")
  }).optional().describe("Data specific to a subscription."),
  metadata: z.record(z.string()).optional().describe("A set of key-value pairs that you can attach to an object. This can be useful for storing additional information about the object in a structured format."),
});
export type CreateStripeCheckoutInput = z.infer<typeof CreateStripeCheckoutInputSchema>;

const CreateStripeCheckoutOutputSchema = z.object({
  url: z.string().url().optional().describe('The URL for the Stripe Checkout session.'),
  id: z.string().optional().describe('The ID of the Stripe Checkout session.'),
  error: z.string().optional().describe('An error message if the session creation failed.'),
});
export type CreateStripeCheckoutOutput = z.infer<typeof CreateStripeCheckoutOutputSchema>;

// This function is exported and can be called from the client.
export async function createStripeCheckout(
  input: CreateStripeCheckoutInput
): Promise<CreateStripeCheckoutOutput> {
  return createStripeCheckoutFlow(input);
}


const createStripeCheckoutFlow = ai.defineFlow(
  {
    name: 'createStripeCheckoutFlow',
    inputSchema: CreateStripeCheckoutInputSchema,
    outputSchema: CreateStripeCheckoutOutputSchema,
  },
  async (input) => {
    
    // This server-side logic is now correctly placed inside the Genkit flow.
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY environment variable not set.');
      return {
        error: 'The application is not configured for payments. Please contact support.',
      };
    }

    try {
        const { default: Stripe } = await import('stripe');
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
        
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            billing_address_collection: 'required',
            customer: input.customer,
            line_items: input.line_items as any, // Cast to any to handle Stripe's complex line_items type
            mode: input.mode,
            success_url: input.successUrl,
            cancel_url: input.cancelUrl,
            subscription_data: input.subscription_data,
            metadata: input.metadata,
        });

        if (!session.url) {
            throw new Error("Stripe did not return a session URL.");
        }
      
      return { url: session.url, id: session.id };

    } catch (e: any) {
      console.error('Error creating Stripe checkout session:', e);
      return {
        error: e.message || 'An unexpected error occurred while creating the checkout session.',
      };
    }
  }
);
