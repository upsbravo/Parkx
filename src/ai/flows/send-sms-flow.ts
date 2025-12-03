
'use server';
/**
 * @fileOverview A server-side flow to securely send an SMS message using Twilio and log the activity.
 *
 * - sendSms - A function that sends an SMS message and logs the result.
 * - SendSmsInput - The input type for the function.
 * - SendSmsOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';

const SendSmsInputSchema = z.object({
  to: z.string().describe("The recipient's phone number in E.164 format (e.g., +15551234567)."),
  body: z.string().min(1).max(1600).describe("The text of the message to send."),
  userId: z.string().describe("The ID of the user to whom the SMS is being sent, for logging purposes."),
});
export type SendSmsInput = z.infer<typeof SendSmsInputSchema>;

const SendSmsOutputSchema = z.object({
  success: z.boolean(),
  error: z.string().optional().describe('An error message if sending failed.'),
});
export type SendSmsOutput = z.infer<typeof SendSmsOutputSchema>;

// Helper to get a Firestore instance for this flow
const getFlowFirestore = () => {
    const appName = 'send-sms-flow-app';
    if (getApps().some(app => app.name === appName)) {
        return getFirestore(getApp(appName));
    }
    const app = initializeApp(firebaseConfig, appName);
    return getFirestore(app);
}

export async function sendSms(
  input: SendSmsInput
): Promise<SendSmsOutput> {
  return sendSmsFlow(input);
}

const sendSmsFlow = ai.defineFlow(
  {
    name: 'sendSmsFlow',
    inputSchema: SendSmsInputSchema,
    outputSchema: SendSmsOutputSchema,
  },
  async ({ to, body, userId }) => {
    const firestore = getFlowFirestore();
    const smsLogRef = collection(firestore, `users/${userId}/sms_logs`);

    const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      const errorMsg = 'The application is not configured for sending SMS messages. Please contact support.';
      console.error('Twilio environment variables are not set.');
      
      // Log failure to Firestore
      await addDoc(smsLogRef, {
          to, body, status: 'failed', error: errorMsg, sentAt: serverTimestamp()
      });

      return { success: false, error: errorMsg };
    }

    try {
      const { default: twilio } = await import('twilio');
      const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

      await client.messages.create({
        body: body,
        from: TWILIO_PHONE_NUMBER,
        to: to,
      });
      
      // Log success to Firestore
      await addDoc(smsLogRef, {
          to, body, status: 'success', sentAt: serverTimestamp()
      });

      return { success: true };

    } catch (e: any) {
      console.error('Error sending SMS via Twilio:', e);

      // Log failure to Firestore
      await addDoc(smsLogRef, {
          to, body, status: 'failed', error: e.message || 'Unknown Twilio error', sentAt: serverTimestamp()
      });

      return {
        success: false,
        error: e.message || 'An unexpected error occurred while sending the message.',
      };
    }
  }
);
