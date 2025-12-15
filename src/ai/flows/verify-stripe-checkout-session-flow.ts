
'use server';
/**
 * @fileOverview A server-side flow to verify a Stripe Checkout session and update the corresponding invoice.
 *
 * - verifyStripeCheckoutSession - A function that fetches session details and updates Firestore.
 * - VerifyStripeCheckoutSessionInput - The input type for the function.
 * - VerifyStripeCheckoutSessionOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore, doc, updateDoc, collectionGroup, query, where, getDocs } from 'firebase/firestore';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import type Stripe from 'stripe';

const VerifyStripeCheckoutSessionInputSchema = z.object({
  sessionId: z.string().describe("The ID of the Stripe Checkout Session to verify."),
});
export type VerifyStripeCheckoutSessionInput = z.infer<typeof VerifyStripeCheckoutSessionInputSchema>;

const VerifyStripeCheckoutSessionOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional().describe('A message indicating the result of the verification.'),
  invoiceId: z.string().optional().describe('The ID of the updated invoice.'),
});
export type VerifyStripeCheckoutSessionOutput = z.infer<typeof VerifyStripeCheckoutSessionOutputSchema>;

const getFlowFirestore = () => {
    const appName = 'verify-stripe-checkout-flow-app';
    if (getApps().some(app => app.name === appName)) {
        return getFirestore(getApp(appName));
    }
    const app = initializeApp(firebaseConfig, appName);
    return getFirestore(app);
};

export async function verifyStripeCheckoutSession(
  input: VerifyStripeCheckoutSessionInput
): Promise<VerifyStripeCheckoutSessionOutput> {
  return verifyStripeCheckoutSessionFlow(input);
}

const verifyStripeCheckoutSessionFlow = ai.defineFlow(
  {
    name: 'verifyStripeCheckoutSessionFlow',
    inputSchema: VerifyStripeCheckoutSessionInputSchema,
    outputSchema: VerifyStripeCheckoutSessionOutputSchema,
  },
  async ({ sessionId }) => {
    if (!process.env.STRIPE_SECRET_KEY) {
      return { success: false, message: 'Stripe is not configured on the server.' };
    }
    
    const firestore = getFlowFirestore();

    try {
      const { default: StripeLib } = await import('stripe');
      const stripe = new StripeLib(process.env.STRIPE_SECRET_KEY!);
      
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ['line_items', 'invoice'],
      });

      if (session.payment_status === 'paid') {
          // The metadata should contain the invoice ID we need to update.
          const { invoiceId, vendorId } = session.metadata || {};

          if (!invoiceId || !vendorId) {
             console.warn(`Webhook alternative: Checkout session ${sessionId} succeeded but had missing metadata.`);
             // As a fallback, query for the invoice using the session ID
             const q = query(collectionGroup(firestore, 'userInvoices'), where('stripeCheckoutSessionId', '==', sessionId));
             const querySnapshot = await getDocs(q);
             if (!querySnapshot.empty) {
                 const invoiceDoc = querySnapshot.docs[0];
                 await updateDoc(invoiceDoc.ref, { status: 'Paid' });
                 return { success: true, message: 'Payment verified and invoice updated.', invoiceId: invoiceDoc.id };
             }
             return { success: false, message: 'Payment was successful but could not find matching invoice to update.' };
          }
          
          const invoiceRef = doc(firestore, 'vendors', vendorId, 'userInvoices', invoiceId);
          await updateDoc(invoiceRef, { status: 'Paid', stripeReceiptUrl: (session.invoice as Stripe.Invoice)?.hosted_invoice_url });

          return { success: true, message: 'Payment successfully verified and invoice updated!', invoiceId };

      } else if (session.status === 'open') {
         return { success: false, message: 'Payment has not been completed.' };
      } else {
         return { success: false, message: `Payment status: ${session.payment_status}.` };
      }

    } catch (e: any) {
      console.error('Error verifying Stripe checkout session:', e);
      return {
        success: false,
        message: e.message || 'An unexpected error occurred while verifying the payment.',
      };
    }
  }
);
