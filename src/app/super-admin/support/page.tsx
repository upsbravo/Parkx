import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { adminVendorMessages, conversationForAI } from "@/lib/data";
import { ConversationSummary } from "./conversation-summary";

export default function SupportPage() {
  const thread = conversationForAI;

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Vendor Conversations</CardTitle>
          <CardDescription>Select a conversation to view.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {adminVendorMessages.map((message) => (
              <li key={message.id} className="p-4 hover:bg-muted/50 cursor-pointer rounded-lg">
                <div className="flex justify-between items-center">
                    <p className="font-semibold">{message.sender}</p>
                    <time className="text-xs text-muted-foreground">{new Date(message.timestamp).toLocaleDateString()}</time>
                </div>
                <p className="text-sm font-medium truncate">{message.subject}</p>
                <p className="text-sm text-muted-foreground truncate">{message.body}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <div className="md:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Conversation Thread</CardTitle>
            <CardDescription>
              Full conversation between Super Admin and InnovateCorp.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap rounded-md border bg-muted p-4 text-sm font-mono text-muted-foreground">
              {thread}
            </div>
          </CardContent>
        </Card>
        <ConversationSummary conversationThread={thread} />
      </div>
    </div>
  );
}
