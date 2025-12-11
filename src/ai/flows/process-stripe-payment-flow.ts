
'use server';
/**
 * @fileOverview A server-side flow to securely process a payment using a Stripe PaymentMethod ID.
 * This flow now supports taking an application fee for the platform.
 * It also verifies that the destination vendor account is capable of receiving payouts.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore, doc, updateDoc, collection, query, limit, getDocs } from 'firebase/firestore';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';

const ProcessStripePaymentInputSchema = z.object({
  paymentMethodId: z.string().describe("The ID of the Stripe PaymentMethod created by Stripe.js on the client."),
  invoiceId: z.string().describe("The ID of the internal invoice document in Firestore."),
  amount: z.number().int().min(50).describe("The amount to charge, in the smallest currency unit (e.g., cents)."),
  currency: z.string().default('usd').describe("The three-letter ISO currency code."),
  customer: z.string().optional().describe("The Stripe Customer ID."),
  vendorId: z.string().describe("The ID of the vendor who is receiving the payment. This is also their Stripe Connected Account ID."),
});
export type ProcessStripePaymentInput = z.infer<typeof ProcessStripePaymentInputSchema>;

const ProcessStripePaymentOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  clientSecret: z.string().optional().describe("The client secret for the PaymentIntent, if further action is needed."),
});
export type ProcessStripePaymentOutput = z.infer<typeof ProcessStripePaymentOutputSchema>;


const getFlowFirestore = () => {
    const appName = 'process-stripe-payment-flow-app';
    if (getApps().some(app => app.name === appName)) {
        return getFirestore(getApp(appName));
    }
    const app = initializeApp(firebaseConfig, appName);
    return getFirestore(app);
}

// This function is exported and can be called from the client.
export async function processStripePayment(
  input: ProcessStripePaymentInput
): Promise<ProcessStripePaymentOutput> {
  return processStripePaymentFlow(input);
}


const processStripePaymentFlow = ai.defineFlow(
  {
    name: 'processStripePaymentFlow',
    inputSchema: ProcessStripePaymentInputSchema,
    outputSchema: ProcessStripePaymentOutputSchema,
  },
  async (input) => {
    const firestore = getFlowFirestore();
    
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY environment variable not set.');
      return {
        success: false,
        message: 'The application is not configured for payments. Please contact support.',
      };
    }

    try {
      const { default: Stripe } = await import('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      
      // CRITICAL VALIDATION STEP: Check if the vendor's account can receive payments.
      const vendorAccount = await stripe.accounts.retrieve(input.vendorId);
      if (!vendorAccount.payouts_enabled) {
          return {
              success: false,
              message: 'This vendor is not currently set up to receive payments. Please contact the vendor.',
          }
      }

      // Fetch the platform fee from the Super Admin's settings
      const superAdminQuery = query(collection(firestore, 'superAdmins'), limit(1));
      const superAdminSnap = await getDocs(superAdminQuery);
      
      let platformFeePercentage = 0.05; // Default to 5%
      if (!superAdminSnap.empty) {
          const superAdminData = superAdminSnap.docs[0].data();
          if (typeof superAdminData.platformFeePercentage === 'number') {
              platformFeePercentage = superAdminData.platformFeePercentage / 100;
          }
      }

      // Calculate the application fee
      const applicationFee = Math.round(input.amount * platformFeePercentage);

      // Step 1: Create a PaymentIntent with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: input.amount,
        currency: input.currency,
        customer: input.customer,
        payment_method: input.paymentMethodId,
        confirm: true,
        off_session: false,
        application_fee_amount: applicationFee,
        transfer_data: {
          destination: input.vendorId, // The vendor's Stripe Connected Account ID
        },
      });

      // Step 2: Handle the PaymentIntent status
      if (paymentIntent.status === 'succeeded') {
        const invoiceRef = doc(firestore, 'vendors', input.vendorId, 'userInvoices', input.invoiceId);
        await updateDoc(invoiceRef, {
          status: 'Paid',
          notes: `Paid via Stripe. PaymentIntent ID: ${paymentIntent.id}`
        });

        return { success: true, message: 'Payment successful!' };
      } else if (paymentIntent.status === 'requires_action') {
        return { 
          success: false, 
          message: 'Further authentication is required.',
          clientSecret: paymentIntent.client_secret,
        };
      } else {
        return { success: false, message: `Payment failed with status: ${paymentIntent.status}. Please try another card.` };
      }
    } catch (e: any) {
      console.error('Error processing payment:', e);
      return { success: false, message: e.message || 'An unexpected error occurred.' };
    }
  }
);

  