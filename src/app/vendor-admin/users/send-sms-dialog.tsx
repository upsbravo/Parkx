
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { sendSms } from "@/ai/flows/send-sms-flow";
import { Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


type EndUser = {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
};

export function SendSmsDialog({
  user,
  open,
  onOpenChange,
}: {
  user: EndUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (open) {
      setMessage(""); // Clear message when dialog opens
    }
  }, [open]);

  const handleSend = async () => {
    if (!user.phone) {
      toast({ variant: "destructive", title: "Error", description: "User does not have a phone number." });
      return;
    }
    if (!message.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Message cannot be empty." });
      return;
    }

    setIsSending(true);

    try {
      const result = await sendSms({
        to: user.phone,
        body: message,
        userId: user.id, // Pass the user ID for logging
      });

      if (result.success) {
        toast({
          title: "SMS Sent!",
          description: `Your message has been sent to ${user.firstName}.`,
        });
        onOpenChange(false);
      } else {
        throw new Error(result.error || "An unknown error occurred.");
      }
    } catch (e: any) {
      console.error("Failed to send SMS:", e);
      toast({
        variant: "destructive",
        title: "Failed to Send SMS",
        description: e.message,
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send SMS to {user.firstName}</DialogTitle>
          <DialogDescription>
            This will send a text message directly to the user's phone number on file.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                    id="message"
                    placeholder="Type your message here..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                />
                 <p className="text-xs text-muted-foreground">{message.length} / 1600 characters</p>
            </div>
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Note</AlertTitle>
                <AlertDescription>
                    Standard messaging rates may apply. This feature should be used for important, time-sensitive communication only.
                </AlertDescription>
            </Alert>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button type="submit" onClick={handleSend} disabled={isSending}>
            {isSending ? "Sending..." : "Send Message"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
