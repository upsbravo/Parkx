
'use server';
/**
 * @fileOverview A Genkit flow to handle incoming Stripe webhooks.
 * This flow is the single endpoint for all Stripe events, verifying signatures
 * and delegating to handlers for business logic.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore, doc, getDoc, updateDoc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import type Stripe from 'stripe';

const StripeWebhookInputSchema = z.object({
  payload: z.string(), // Raw request body from Stripe
  signature: z.string(), // The stripe-signature header
});

const getWebhookFirestore = () => {
    const appName = 'stripe-webhook-flow-app';
    if (getApps().some(app => app.name === appName)) {
        return getFirestore(getApp(appName));
    }
    const app = initializeApp(firebaseConfig, appName);
    return getFirestore(app);
}

export async function handleStripeWebhook(payload: string, signature: string): Promise<{ received: boolean; error?: string }> {
  try {
    await stripeWebhookFlow({ payload, signature });
    return { received: true };
  } catch (error: any) {
    console.error('Webhook handling failed:', error);
    return { received: false, error: error.message };
  }
}

const stripeWebhookFlow = ai.defineFlow(
  {
    name: 'stripeWebhookFlow',
    inputSchema: StripeWebhookInputSchema,
    outputSchema: z.object({ success: z.boolean() }),
  },
  async ({ payload, signature }) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not set in environment variables.');
    }

    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }
    
    console.log(`Received Stripe event: ${event.type}`);

    // Route event to the appropriate handler
    switch (event.type) {
      case 'charge.succeeded':
        await handleChargeSucceeded(event.data.object as Stripe.Charge);
        break;
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.resumed':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.paused':
        await handleSubscriptionPaused(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.created':
        await handleInvoiceCreated(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.paid':
         await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case 'payout.paid':
        await handlePayoutPaid(event.data.object as Stripe.Payout);
        break;
      case 'checkout.session.completed':
         await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    
    return { success: true };
  }
);


async function getVendorIdByCustomerId(customerId: string): Promise<string | null> {
    const firestore = getWebhookFirestore();
    const q = query(collection(firestore, 'vendors'), where('stripeCustomerId', '==', customerId));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        return querySnapshot.docs[0].id;
    }
    return null;
}

async function getVendorIdByStripeAccountId(accountId: string): Promise<string | null> {
    const firestore = getWebhookFirestore();
    const q = query(collection(firestore, 'vendors'), where('stripeAccountId', '==', accountId));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        return querySnapshot.docs[0].id;
    }
    return null;
}

async function handleChargeSucceeded(charge: Stripe.Charge) {
    const firestore = getWebhookFirestore();
    const vendorId = charge.destination ? await getVendorIdByStripeAccountId(charge.destination as string) : null;

    if (!vendorId) {
        console.log(`Charge ${charge.id} succeeded but could not find matching vendor.`);
        return;
    }
    const vendorSnap = await getDoc(doc(firestore, 'vendors', vendorId));
    const vendorName = vendorSnap.exists() ? vendorSnap.data().name : 'Unknown Vendor';
    
    const fee = charge.application_fee_amount || 0;
    const net = charge.amount - fee;

    const transactionData = {
        id: charge.id,
        created: charge.created,
        amount: charge.amount,
        currency: charge.currency,
        status: charge.status,
        vendorId: vendorId,
        vendorName: vendorName,
        customerEmail: charge.billing_details?.email || 'N/A',
        receiptUrl: charge.receipt_url,
        type: charge.invoice ? 'subscription' : 'payment' as 'subscription' | 'payment',
        fee: fee,
        net: net,
        amountRefunded: 0,
        refundedAt: null,
    };
    
    const transactionRef = doc(firestore, 'transactions', charge.id);
    await setDoc(transactionRef, transactionData, { merge: true });
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const firestore = getWebhookFirestore();
  const transactionRef = doc(firestore, 'transactions', charge.id);
  
  await updateDoc(transactionRef, {
    status: 'refunded',
    amountRefunded: charge.amount_refunded,
    refundedAt: charge.refunds.data[0]?.created || Math.floor(Date.now() / 1000),
  });
}


async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const firestore = getWebhookFirestore();
  const vendorId = await getVendorIdByCustomerId(subscription.customer as string);
  
  if (!vendorId) return;

  const vendorRef = doc(firestore, 'vendors', vendorId);
  const newStatus = (subscription.status === 'active' || subscription.status === 'trialing') ? 'Active' : 'Inactive';
  
  await updateDoc(vendorRef, { 
      status: newStatus,
      stripeSubscriptionId: subscription.id,
      trialEnds: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
  });
}

async function handleSubscriptionPaused(subscription: Stripe.Subscription) {
  const firestore = getWebhookFirestore();
  const vendorId = await getVendorIdByCustomerId(subscription.customer as string);
  
  if (!vendorId) return;

  const vendorRef = doc(firestore, 'vendors', vendorId);
  await updateDoc(vendorRef, { status: 'Paused' });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const firestore = getWebhookFirestore();
  const vendorId = await getVendorIdByCustomerId(subscription.customer as string);
  if (!vendorId) return;

  const vendorRef = doc(firestore, 'vendors', vendorId);
  await updateDoc(vendorRef, { status: 'Canceled', stripeSubscriptionId: null });
}

async function handleInvoiceCreated(invoice: Stripe.Invoice) {
    if (invoice.billing_reason !== 'subscription_cycle' && invoice.billing_reason !== 'subscription_create') {
        return; // Only care about subscription invoices
    }

    const firestore = getWebhookFirestore();
    const vendorId = await getVendorIdByCustomerId(invoice.customer as string);
    if (!vendorId) return;

    const vendorSnap = await getDoc(doc(firestore, 'vendors', vendorId));
    if (!vendorSnap.exists()) return;

    const vendorName = vendorSnap.data().name;
    
    const invoiceRef = doc(firestore, 'vendors', vendorId, 'vendorInvoices', invoice.id);
    await setDoc(invoiceRef, {
        id: invoice.id,
        vendorId: vendorId,
        vendorName: vendorName,
        amount: invoice.amount_due / 100,
        dueDate: new Date(invoice.period_end * 1000).toISOString(),
        status: 'Pending',
        notes: `Stripe Invoice for subscription ${invoice.subscription}.`,
        stripeInvoicePdfUrl: invoice.invoice_pdf,
    }, { merge: true });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
    const firestore = getWebhookFirestore();
    const vendorId = await getVendorIdByCustomerId(invoice.customer as string);
    if (!vendorId) return;

    const vendorRef = doc(firestore, 'vendors', vendorId);
    await updateDoc(vendorRef, { status: 'Active' });

    const invoiceRef = doc(firestore, 'vendors', vendorId, 'vendorInvoices', invoice.id);
    await updateDoc(invoiceRef, { 
        status: 'Paid', 
        stripeInvoicePdfUrl: invoice.invoice_pdf 
    });
}


async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    const firestore = getWebhookFirestore();
    
    // Check if it's a vendor invoice (subscription)
    const vendorId = await getVendorIdByCustomerId(invoice.customer as string);
    if (vendorId) {
        const vendorInvoiceRef = doc(firestore, 'vendors', vendorId, 'vendorInvoices', invoice.id);
        await updateDoc(vendorInvoiceRef, { 
            status: 'Paid', 
            stripeInvoicePdfUrl: invoice.invoice_pdf 
        });
        return;
    }

    // Check if it's a user invoice (one-time payment)
    const checkoutSessionId = invoice.checkout_session;
    if (!checkoutSessionId) return;

    const q = query(collectionGroup(firestore, 'userInvoices'), where('stripeCheckoutSessionId', '==', checkoutSessionId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        const userInvoiceDoc = snapshot.docs[0];
        await updateDoc(userInvoiceDoc.ref, {
            status: 'Paid',
            stripeReceiptUrl: invoice.hosted_invoice_url,
        });
    }
}


async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const firestore = getWebhookFirestore();
    const vendorId = await getVendorIdByCustomerId(invoice.customer as string);
    if (!vendorId) return;

    const vendorRef = doc(firestore, 'vendors', vendorId);
    await updateDoc(vendorRef, { status: 'Inactive' });
    
    const invoiceRef = doc(firestore, 'vendors', vendorId, 'vendorInvoices', invoice.id);
    await updateDoc(invoiceRef, { status: 'Overdue' });
}


async function handlePayoutPaid(payout: Stripe.Payout) {
    const firestore = getWebhookFirestore();
    // In Connect, payout.destination is the Stripe Account ID
    const vendorId = await getVendorIdByStripeAccountId(payout.destination as string);
    if (!vendorId) return;
  
    const payoutRef = doc(firestore, 'vendors', vendorId, 'payouts', payout.id);
    await setDoc(payoutRef, {
        id: payout.id,
        amount: payout.amount,
        currency: payout.currency,
        arrival_date: payout.arrival_date,
        created: payout.created,
        status: payout.status,
        description: payout.description,
        type: payout.type,
    });
}


async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    if (session.mode === 'subscription' && session.subscription) {
        const firestore = getWebhookFirestore();
        const vendorId = await getVendorIdByCustomerId(session.customer as string);
        if (vendorId) {
            const vendorRef = doc(firestore, 'vendors', vendorId);
            await updateDoc(vendorRef, {
                stripeSubscriptionId: session.subscription,
                status: 'Active',
            });
        }
    }
}

  