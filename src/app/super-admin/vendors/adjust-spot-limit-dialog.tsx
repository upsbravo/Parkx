
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
import { useState } from "react";
import { useFirestore, updateDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
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

// Hardcoded Price ID for additional spots
const ADDITIONAL_SPOT_PRICE_ID = 'price_1SYZeTFOrzQHr7Jw6MFDflI4';

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
    
    // First, update the spot limit in Firestore optimistically
    const vendorRef = doc(firestore, "vendors", vendor.id);
    updateDocumentNonBlocking(vendorRef, { spotLimit: limit });
    
    toast({
      title: "Spot Limit Updated",
      description: `${vendor.name}'s spot limit has been changed to ${limit}. Now updating subscription...`,
    });

    // If the vendor is on a trial or active subscription, update Stripe
    if ((vendor.status === 'Trial' || vendor.status === 'Active') && vendor.stripeSubscriptionId) {
        const additionalSpots = Math.max(0, limit - 20);

        try {
            const result = await updateStripeSubscription({
                subscriptionId: vendor.stripeSubscriptionId,
                priceId: ADDITIONAL_SPOT_PRICE_ID,
                quantity: additionalSpots,
            });

            if (!result.success) {
                throw new Error(result.error || "Unknown Stripe error.");
            }

            toast({
                title: "Subscription Updated",
                description: `Recurring billing for ${vendor.name} has been adjusted for the new spot limit.`,
            });

        } catch (error: any) {
            console.error("Stripe subscription update failed:", error);
            toast({
                variant: "destructive",
                title: "Stripe Update Failed",
                description: `Could not update the Stripe subscription. Please check Stripe dashboard. Error: ${error.message}`,
                duration: 10000,
            });
            // Revert the limit in Firestore if Stripe fails
            updateDocumentNonBlocking(vendorRef, { spotLimit: vendor.spotLimit });
            setIsSaving(false);
            return;
        }
    }

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
                This will update the vendor's recurring subscription. Prorated charges or credits will be handled by Stripe on their next invoice.
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
