"use client";

import { useState } from "react";
import { summarizeVendorConversations } from "@/ai/flows/summarize-vendor-conversations";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

export function ConversationSummary({
  conversationThread,
}: {
  conversationThread: string;
}) {
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSummarize = async () => {
    setIsLoading(true);
    setError("");
    setSummary("");
    try {
      const result = await summarizeVendorConversations({ conversationThread });
      setSummary(result.summary);
    } catch (e) {
      setError("Failed to generate summary. Please try again.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
            <div>
                <CardTitle>AI-Powered Summary</CardTitle>
                <CardDescription>
                    Generate a concise summary of the conversation thread.
                </CardDescription>
            </div>
            <Button onClick={handleSummarize} disabled={isLoading}>
                <Sparkles className="mr-2 h-4 w-4" />
                {isLoading ? "Generating..." : "Summarize with AI"}
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
            <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
            </div>
        )}
        {error && (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}
        {summary && (
            <div className="prose prose-sm max-w-none rounded-md border bg-muted p-4 text-muted-foreground">
                <p>{summary}</p>
            </div>
        )}
        {!isLoading && !error && !summary && (
            <div className="flex items-center justify-center rounded-md border-2 border-dashed h-24">
                <p className="text-sm text-muted-foreground">Click the button to generate a summary.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
