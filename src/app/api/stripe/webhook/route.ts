
import { handleStripeWebhook } from "@/ai/flows/stripe-webhook-flow";
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = headers().get('stripe-signature') as string;

    if (!signature) {
      return NextResponse.json({ error: 'No stripe-signature header found.' }, { status: 400 });
    }

    const { received, error } = await handleStripeWebhook(rawBody, signature);

    if (error) {
      return NextResponse.json({ error: `Webhook Error: ${error}` }, { status: 400 });
    }
    
    if (received) {
      return NextResponse.json({ received: true });
    } else {
      return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
    }

  } catch (err: any) => {
    console.error('Error in Stripe webhook handler:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
