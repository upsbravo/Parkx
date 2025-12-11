
import { handleStripeWebhook } from "@/ai/flows/stripe-webhook-flow";
import { headers } from 'next/headers';
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // Read the raw request body as a string. This is critical for signature verification.
    const bodyText = await req.text();
    const signature = headers().get('stripe-signature') as string;

    if (!signature) {
      return NextResponse.json({ error: 'No stripe-signature header found.' }, { status: 400 });
    }

    // Pass the raw string and signature to the Genkit flow for verification and processing.
    const { received, error } = await handleStripeWebhook(bodyText, signature);

    if (error) {
      // It's important to return a 400 status code for signature verification errors.
      return NextResponse.json({ error: `Webhook Error: ${error}` }, { status: 400 });
    }
    
    if (received) {
      return NextResponse.json({ received: true });
    } else {
      // For other processing errors, a 500 status might be more appropriate.
      return NextResponse.json({ error: 'Webhook processing failed after verification.' }, { status: 500 });
    }

  } catch (err: any) {
    console.error('Error in Stripe webhook route handler:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
