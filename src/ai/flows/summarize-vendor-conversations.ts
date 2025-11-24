'use server';

/**
 * @fileOverview Summarizes conversation threads between Super Admin and Vendor Admins.
 *
 * - summarizeVendorConversations - A function that summarizes conversation threads.
 * - SummarizeVendorConversationsInput - The input type for the summarizeVendorConversations function.
 * - SummarizeVendorConversationsOutput - The return type for the summarizeVendorConversations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeVendorConversationsInputSchema = z.object({
  conversationThread: z
    .string()
    .describe('The complete conversation thread between Super Admin and a Vendor Admin.'),
});
export type SummarizeVendorConversationsInput = z.infer<typeof SummarizeVendorConversationsInputSchema>;

const SummarizeVendorConversationsOutputSchema = z.object({
  summary: z
    .string()
    .describe('A concise summary of the conversation thread, highlighting key issues and resolutions.'),
});
export type SummarizeVendorConversationsOutput = z.infer<typeof SummarizeVendorConversationsOutputSchema>;

export async function summarizeVendorConversations(
  input: SummarizeVendorConversationsInput
): Promise<SummarizeVendorConversationsOutput> {
  return summarizeVendorConversationsFlow(input);
}

const summarizeVendorConversationsPrompt = ai.definePrompt({
  name: 'summarizeVendorConversationsPrompt',
  input: {schema: SummarizeVendorConversationsInputSchema},
  output: {schema: SummarizeVendorConversationsOutputSchema},
  prompt: `You are an AI assistant tasked with summarizing conversation threads between a Super Admin and a Vendor Admin.

  Your goal is to provide a concise summary of the conversation, highlighting the key issues discussed and any resolutions reached.

  Conversation Thread: {{{conversationThread}}}

  Summary:`, // Ensure a newline character at the end for better formatting
});

const summarizeVendorConversationsFlow = ai.defineFlow(
  {
    name: 'summarizeVendorConversationsFlow',
    inputSchema: SummarizeVendorConversationsInputSchema,
    outputSchema: SummarizeVendorConversationsOutputSchema,
  },
  async input => {
    const {output} = await summarizeVendorConversationsPrompt(input);
    return output!;
  }
);
