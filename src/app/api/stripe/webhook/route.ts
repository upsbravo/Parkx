
import { handleStripeWebhook } from "@/ai/flows/stripe-webhook-flow";
import { headers } from 'next/headers';
import { NextResponse } from "next/server";

/**
 * This route handler is responsible for receiving and processing webhooks from Stripe.
 *
 * It is CRITICAL that we disable the default body parser for this route.
 * Stripe requires the raw, unmodified request body to verify the webhook signature.
 * By disabling bodyParser, we can read the raw request body as a string.
 */
export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: Request) {
  try {
    // Read the raw request body as a string.
    const bodyText = await req.text();
    const signature = headers().get('stripe-signature') as string;

    if (!signature) {
      return NextResponse.json({ error: 'No stripe-signature header found.' }, { status: 400 });
    }

    // Pass the raw string and signature to the Genkit flow for verification and processing.
    const { received, error } = await handleStripeWebhook(bodyText, signature);

    if (error) {
      return NextResponse.json({ error: `Webhook Error: ${error}` }, { status: 400 });
    }
    
    if (received) {
      return NextResponse.json({ received: true });
    } else {
      return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
    }

  } catch (err: any) {
    console.error('Error in Stripe webhook route handler:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
