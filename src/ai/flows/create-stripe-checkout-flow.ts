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
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

const LineItemSchema = z.object({
  price: z.string().describe("The ID of the Stripe Price object."),
  quantity: z.number().int().min(1).describe("The quantity of the price object."),
});

const PriceDataSchema = z.object({
    currency: z.string().default('usd'),
    product_data: z.object({
        name: z.string(),
    }),
    unit_amount: z.number().int().min(1), // amount in cents
});

const LineItemWithPriceDataSchema = z.object({
    price_data: PriceDataSchema,
    quantity: z.number().int().min(1),
});

const CreateStripeCheckoutInputSchema = z.object({
  line_items: z.array(z.union([LineItemSchema, LineItemWithPriceDataSchema])).min(1).describe("An array of line items."),
  successUrl: z.string().url().describe('The URL to redirect to on success.'),
  cancelUrl: z.string().url().describe('The URL to redirect to on cancellation.'),
  uid: z.string().describe("The UID of the user for whom the session is created."),
  mode: z.enum(['subscription', 'payment']).describe("The mode of the checkout session."),
  subscription_data: z.object({
    trial_period_days: z.number().int().optional().describe("Number of days for the trial period.")
  }).optional().describe("Data specific to a subscription."),
  // The customer ID is now optional; we'll look it up if not provided.
  customer: z.string().optional().describe("The Stripe customer ID. If not provided, it will be looked up using the UID."),
});
export type CreateStripeCheckoutInput = z.infer<typeof CreateStripeCheckoutInputSchema>;

const CreateStripeCheckoutOutputSchema = z.object({
  url: z.string().url().optional().describe('The URL for the Stripe Checkout session.'),
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
    
    // Ensure we are in a server environment
    if (typeof window !== 'undefined') {
        return { error: "This function can only be run on the server." };
    }

    try {
        const { default: Stripe } = await import('stripe');
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
        const { firestore } = initializeFirebase();

        let stripeCustomerId = input.customer;

        // If a Stripe Customer ID isn't provided, look it up in the `customers` collection using the UID.
        if (!stripeCustomerId) {
            const customerDocRef = doc(firestore, 'customers', input.uid);
            const customerSnap = await getDoc(customerDocRef);
            if (customerSnap.exists() && customerSnap.data().stripeId) {
                stripeCustomerId = customerSnap.data().stripeId;
            } else {
                 // If still no customer ID, we can create one on the fly for them
                const customer = await stripe.customers.create({
                    email: customerSnap.data()?.email, // Assuming email is stored in the customer doc
                    name: customerSnap.data()?.name, // Assuming name is stored
                    metadata: {
                        firebaseUID: input.uid,
                    }
                });
                stripeCustomerId = customer.id;
            }
        }
        
        if (!stripeCustomerId) {
            throw new Error("Could not find or create a Stripe customer for the given user.");
        }
        
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            billing_address_collection: 'required',
            customer: stripeCustomerId,
            line_items: input.line_items as any, // Cast as any to handle union type
            mode: input.mode,
            success_url: input.successUrl,
            cancel_url: input.cancelUrl,
            subscription_data: input.subscription_data,
        });

        if (!session.url) {
            throw new Error("Stripe did not return a session URL.");
        }
      
      return { url: session.url };

    } catch (e: any) {
      console.error('Error creating Stripe checkout session:', e);
      return {
        error: e.message || 'An unexpected error occurred while creating the checkout session.',
      };
    }
  }
);
