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
import { useState, useEffect } from "react";
import { useFirestore, updateDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase";
import { doc, collection, serverTimestamp } from "firebase/firestore";
import { updateStripeSubscription } from "@/ai/flows/update-stripe-subscription-flow";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

type Vendor = {
  id: string;
  name: string;
  spotLimit: number;
  spotsUsed: number;
  status: string;
  stripeSubscriptionId?: string;
};

export function AdjustSpotLimitDialog({
  vendor,
  open,
  onOpenChange,
}: {
  vendor: Vendor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [limit, setLimit] = useState(vendor.spotLimit);
  const [isSaving, setIsSaving] = useState(false);

  // When the dialog opens or the vendor changes, reset the limit state
  useEffect(() => {
    if (open) {
      setLimit(vendor.spotLimit);
    }
  }, [open, vendor.spotLimit]);


  const handleSave = async () => {
    if (!firestore) {
        toast({ variant: "destructive", title: "Error", description: "Database not available." });
        return;
    }

    if (limit < (vendor.spotsUsed || 0)) {
        toast({
            variant: "destructive",
            title: "Invalid Limit",
            description: "New limit cannot be less than the number of spots currently in use.",
        });
        return;
    }
    
    setIsSaving(true);
    
    // Step 1: Update Stripe first if a subscription ID exists.
    if (vendor.stripeSubscriptionId) {
        const additionalSpots = Math.max(0, limit - 20);

        try {
            const result = await updateStripeSubscription({
                subscriptionId: vendor.stripeSubscriptionId,
                quantity: additionalSpots,
            });

            if (!result.success) {
                // This will catch errors returned from the backend flow
                throw new Error(result.error || "An unknown error occurred while updating the subscription in Stripe.");
            }

            toast({
                title: "Stripe Subscription Updated",
                description: `Recurring billing for ${vendor.name} has been adjusted.`,
            });
            
            // On success, create a notification for the vendor
            const notifRef = collection(firestore, 'vendors', vendor.id, 'notifications');
            addDocumentNonBlocking(notifRef, {
                title: "Subscription Updated",
                message: `Your spot limit has been adjusted to ${limit}. Your billing has been updated accordingly.`,
                type: 'payment_received',
                isRead: false,
                createdAt: serverTimestamp(),
            });


        } catch (error: any) {
            console.error("Stripe subscription update failed:", error);
            toast({
                variant: "destructive",
                title: "Stripe Update Failed",
                description: `Could not update the Stripe subscription. Error: ${error.message}`,
                duration: 10000,
            });
            setIsSaving(false);
            return; // Stop execution if Stripe update fails
        }
    }

    // Step 2: If Stripe update was successful (or not needed), update Firestore.
    const vendorRef = doc(firestore, "vendors", vendor.id);
    await updateDocumentNonBlocking(vendorRef, { 
        spotLimit: limit,
        spotLimitIncreaseRequested: false, // Also reset the request flag
        spotLimitRequestDate: null,
    });
    
    toast({
      title: "Spot Limit Updated",
      description: `${vendor.name}'s spot limit has been changed to ${limit} in the database.`,
    });

    setIsSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adjust Spot Limit for {vendor.name}</DialogTitle>
          <DialogDescription>
            Current usage: {vendor.spotsUsed || 0} / {vendor.spotLimit}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="spot-limit" className="text-right">
              New Limit
            </Label>
            <Input
              id="spot-limit"
              type="number"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="col-span-3"
            />
          </div>
          {(vendor.status === 'Trial' || vendor.status === 'Active') && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Billing Information</AlertTitle>
              <AlertDescription>
                This will update the vendor's recurring subscription in Stripe. The next invoice will reflect the new total.
              </AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Update Subscription & Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
