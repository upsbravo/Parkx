
"use client";

import { useState } from "react";
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
import { ShieldAlert } from "lucide-react";

// This is the master passcode. In a real application, this should be
// managed securely and not hardcoded.
const MASTER_PASSCODE = "$imran";

export function PasscodeDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [passcode, setPasscode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleProceed = () => {
    setIsLoading(true);
    if (passcode === MASTER_PASSCODE) {
      toast({
        title: "Passcode Verified",
        description: "You may now proceed with deletion.",
      });
      onSuccess();
    } else {
      toast({
        variant: "destructive",
        title: "Incorrect Passcode",
        description: "The passcode you entered is incorrect. Please try again.",
      });
    }
    setIsLoading(false);
    setPasscode(""); // Clear passcode after attempt
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-destructive" />
            Master Passcode Required
          </DialogTitle>
          <DialogDescription>
            To proceed with this destructive action, please enter the master
            passcode. This is a safeguard to prevent accidental deletion.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="passcode" className="sr-only">
              Master Passcode
            </Label>
            <Input
              id="passcode"
              type="password"
              placeholder="Enter master passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleProceed()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" onClick={handleProceed} disabled={isLoading}>
            {isLoading ? "Verifying..." : "Proceed"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
