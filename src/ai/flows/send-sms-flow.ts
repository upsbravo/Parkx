'use server';
/**
 * @fileOverview A server-side flow to securely send an SMS message using Twilio.
 *
 * - sendSms - A function that sends an SMS message.
 * - SendSmsInput - The input type for the function.
 * - SendSmsOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SendSmsInputSchema = z.object({
  to: z.string().describe("The recipient's phone number in E.164 format (e.g., +15551234567)."),
  body: z.string().min(1).max(1600).describe("The text of the message to send."),
});
export type SendSmsInput = z.infer<typeof SendSmsInputSchema>;

const SendSmsOutputSchema = z.object({
  success: z.boolean(),
  error: z.string().optional().describe('An error message if sending failed.'),
});
export type SendSmsOutput = z.infer<typeof SendSmsOutputSchema>;

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
  async ({ to, body }) => {
    const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error('Twilio environment variables are not set.');
      return {
        success: false,
        error: 'The application is not configured for sending SMS messages. Please contact support.',
      };
    }

    try {
      // Dynamically import the twilio package
      const { default: twilio } = await import('twilio');
      const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

      await client.messages.create({
        body: body,
        from: TWILIO_PHONE_NUMBER,
        to: to,
      });

      return { success: true };

    } catch (e: any) {
      console.error('Error sending SMS via Twilio:', e);
      return {
        success: false,
        error: e.message || 'An unexpected error occurred while sending the message.',
      };
    }
  }
);
