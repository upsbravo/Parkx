
import { handleStripeWebhook } from "@/ai/flows/stripe-webhook-flow";
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from "next/server";

// This is the critical change: It disables the default Next.js body parser
// for this route, allowing us to receive the raw request body from Stripe.
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function to read the raw request body into a buffer
async function getRawBody(req: NextRequest) {
    const reader = req.body?.getReader();
    if (!reader) {
        return new Uint8Array();
    }
    const chunks: Uint8Array[] = [];
    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        chunks.push(value);
    }
    
    // Concatenate all chunks into a single Uint8Array
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const body = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
        body.set(chunk, offset);
        offset += chunk.length;
    }
    return body;
}


export async function POST(req: NextRequest) {
  try {
    const bodyBuffer = await getRawBody(req);
    const signature = headers().get('stripe-signature') as string;

    if (!signature) {
      return NextResponse.json({ error: 'No stripe-signature header found.' }, { status: 400 });
    }

    // Pass the raw buffer to the handler. Stripe's library can handle buffers directly.
    const { received, error } = await handleStripeWebhook(bodyBuffer.toString(), signature);

    if (error) {
      return NextResponse.json({ error: `Webhook Error: ${error}` }, { status: 400 });
    }
    
    if (received) {
      return NextResponse.json({ received: true });
    } else {
      return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
    }

  } catch (err: any) {
    console.error('Error in Stripe webhook handler:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
