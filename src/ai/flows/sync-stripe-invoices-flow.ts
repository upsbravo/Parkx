
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
import { getFirestore, collection, where, query, getDocs, doc, setDoc, writeBatch } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

const SyncStripeInvoicesInputSchema = z.object({
  stripeCustomerId: z.string().describe("The ID of the Stripe Customer whose invoices should be synced."),
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
  async ({ stripeCustomerId }) => {
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

      // 1. Find the vendor details from our database using the Stripe Customer ID.
      const vendorsRef = collection(firestore, 'vendors');
      const q = query(vendorsRef, where('stripeCustomerId', '==', stripeCustomerId));
      const vendorSnapshot = await getDocs(q);

      if (vendorSnapshot.empty) {
        return { success: false, syncedCount: 0, error: 'Could not find a vendor with the provided Stripe Customer ID.' };
      }
      const vendorDoc = vendorSnapshot.docs[0];
      const vendorId = vendorDoc.id;
      const vendorName = vendorDoc.data().name;

      // 2. Fetch all invoices for this customer from Stripe.
      const stripeInvoices = await stripe.invoices.list({
        customer: stripeCustomerId,
        limit: 100, // Get up to 100 past invoices
      });
      
      const batch = writeBatch(firestore);
      let newInvoiceCount = 0;

      // 3. Loop through Stripe invoices and create them in Firestore if they don't exist.
      for (const invoice of stripeInvoices.data) {
          // We only care about invoices that have been paid or failed, not drafts.
          if (!invoice.paid && invoice.status !== 'open') continue;

          const invoiceRef = doc(firestore, 'vendorInvoices', invoice.id);
          const existingInvoiceSnap = await getDocs(query(collection(firestore, 'vendorInvoices'), where('id', '==', invoice.id)));
          
          if (existingInvoiceSnap.empty) {
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
