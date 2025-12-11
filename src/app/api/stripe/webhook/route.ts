
import { handleStripeWebhook } from "@/ai/flows/stripe-webhook-flow";
import { headers } from 'next/headers';
import { NextResponse } from "next/server";

// This helper function reads the request stream and returns it as a Buffer.
async function getRawBody(req: Request) {
    const reader = req.body?.getReader();
    if (!reader) {
        throw new Error('Request body is not readable');
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
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
    }
    return Buffer.from(combined);
}

export async function POST(req: Request) {
  try {
    // Read the raw request body as a Buffer. This is the critical change.
    const bodyBuffer = await getRawBody(req);
    const signature = headers().get('stripe-signature') as string;

    if (!signature) {
      return NextResponse.json({ error: 'No stripe-signature header found.' }, { status: 400 });
    }

    // Pass the raw buffer (converted to a string for the Genkit flow) and signature to the handler.
    // The Stripe SDK's `constructEvent` function can correctly interpret this raw payload.
    const { received, error } = await handleStripeWebhook(bodyBuffer.toString(), signature);

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
