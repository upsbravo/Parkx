
'use server';
/**
 * @fileOverview A server-side flow to securely sync historical Stripe invoices for a customer.
 *
 * - syncStripeInvoices - Fetches invoices from Stripe and creates corresponding documents in Firestore.
 * - SyncStripeInvoicesInput - The input type for the function.
 * - SyncStripeInvoicesOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore, collection, doc, getDoc, writeBatch } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

const SyncStripeInvoicesInputSchema = z.object({
  stripeCustomerId: z.string().describe("The ID of the Stripe Customer whose invoices should be synced."),
  vendorId: z.string().describe("The Firebase UID of the vendor requesting the sync."),
});
export type SyncStripeInvoicesInput = z.infer<typeof SyncStripeInvoicesInputSchema>;

const SyncStripeInvoicesOutputSchema = z.object({
  success: z.boolean(),
  syncedCount: z.number().describe('The number of new invoices synced to the database.'),
  error: z.string().optional().describe('An error message if the sync failed.'),
});
export type SyncStripeInvoicesOutput = z.infer<typeof SyncStripeInvoicesOutputSchema>;

export async function syncStripeInvoices(
  input: SyncStripeInvoicesInput
): Promise<SyncStripeInvoicesOutput> {
  return syncStripeInvoicesFlow(input);
}

const syncStripeInvoicesFlow = ai.defineFlow(
  {
    name: 'syncStripeInvoicesFlow',
    inputSchema: SyncStripeInvoicesInputSchema,
    outputSchema: SyncStripeInvoicesOutputSchema,
  },
  async ({ stripeCustomerId, vendorId }) => {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY environment variable not set.');
      return {
        success: false,
        syncedCount: 0,
        error: 'The application is not configured for payments. Please contact support.',
      };
    }

    const { firestore } = initializeFirebase();

    try {
      const { default: Stripe } = await import('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

      // 1. Find the vendor details from our database using the provided vendorId.
      const vendorRef = doc(firestore, 'vendors', vendorId);
      const vendorSnapshot = await getDoc(vendorRef);

      if (!vendorSnapshot.exists()) {
        return { success: false, syncedCount: 0, error: 'Could not find a vendor with the provided ID.' };
      }
      const vendorData = vendorSnapshot.data();
      const vendorName = vendorData.name;
      
      // Security check: ensure the stripe ID matches
      if (vendorData.stripeCustomerId !== stripeCustomerId) {
           return { success: false, syncedCount: 0, error: 'Stripe customer ID mismatch.' };
      }

      // 2. Fetch all invoices for this customer from Stripe.
      const stripeInvoices = await stripe.invoices.list({
        customer: stripeCustomerId,
        limit: 100, // Get up to 100 past invoices
      });
      
      const batch = writeBatch(firestore);
      let newInvoiceCount = 0;
      const vendorInvoicesRef = collection(firestore, 'vendorInvoices');

      // 3. Loop through Stripe invoices and create them in Firestore if they don't exist.
      for (const invoice of stripeInvoices.data) {
          // We only care about invoices that have been paid or failed, not drafts.
          if (!invoice.paid && invoice.status !== 'open') continue;

          const invoiceRef = doc(vendorInvoicesRef, invoice.id);
          const existingInvoiceSnap = await getDoc(invoiceRef);
          
          if (!existingInvoiceSnap.exists()) {
            newInvoiceCount++;
            const status = invoice.status === 'paid' ? 'Paid' : (invoice.status === 'open' ? 'Overdue' : 'Pending');

            batch.set(invoiceRef, {
                id: invoice.id,
                vendorId: vendorId,
                vendorName: vendorName,
                amount: invoice.amount_paid / 100, // Convert from cents
                dueDate: new Date(invoice.period_start * 1000).toISOString(),
                status: status,
                notes: `Stripe Invoice for subscription ${invoice.subscription}.`,
                stripeInvoicePdfUrl: invoice.invoice_pdf,
            });
          }
      }

      if (newInvoiceCount > 0) {
        await batch.commit();
      }

      return { success: true, syncedCount: newInvoiceCount };

    } catch (e: any) {
      console.error('Error syncing Stripe invoices:', e);
      return {
        success: false,
        syncedCount: 0,
        error: e.message || 'An unexpected error occurred while syncing invoices.',
      };
    }
  }
);
