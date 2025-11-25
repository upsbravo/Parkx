"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase";
import { collection, addDoc } from "firebase/firestore";
import { useState } from "react";

export function InviteVendorDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [email, setEmail] = useState("");

  const handleInvite = async () => {
    if (!email) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a valid email address.",
      });
      return;
    }

    try {
      await addDoc(collection(firestore, "vendors"), {
        email: email,
        name: "New Vendor", // Default name
        status: "Pending",
        joinDate: new Date().toISOString(),
        trialEnds: null,
        spotsUsed: 0,
        spotLimit: 20, // Default limit
      });

      toast({
        title: "Invitation Sent!",
        description: `An invitation has been sent to ${email}.`,
      });
      onOpenChange(false);
      setEmail("");
    } catch (error) {
      console.error("Error inviting vendor: ", error);
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "There was a problem sending the invitation.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite New Vendor</DialogTitle>
          <DialogDescription>
            Enter the email address of the vendor you want to invite. They will
            receive an email with instructions to set up their account.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="vendor@example.com"
              className="col-span-3"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleInvite}>
            Send Invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
