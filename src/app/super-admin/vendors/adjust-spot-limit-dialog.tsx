
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
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { doc, collection } from "firebase/firestore";
import { useRouter } from "next/navigation";

type Vendor = {
  id: string;
  name: string;
  spotLimit: number;
  spotsUsed: number;
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
  const router = useRouter();
  const [limit, setLimit] = useState(vendor.spotLimit);

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
    
    const additionalSpots = limit - vendor.spotLimit;

    const vendorRef = doc(firestore, "vendors", vendor.id);
    updateDocumentNonBlocking(vendorRef, { spotLimit: limit });

    toast({
      title: "Spot Limit Updated",
      description: `${vendor.name}'s spot limit has been changed to ${limit}.`,
    });
    onOpenChange(false);

    if (additionalSpots > 0) {
        const costPerSpot = 10;
        const invoiceAmount = additionalSpots * costPerSpot;

        const invoicesRef = collection(firestore, "vendorInvoices");
        await addDocumentNonBlocking(invoicesRef, {
            vendorId: vendor.id,
            vendorName: vendor.name,
            amount: invoiceAmount,
            dueDate: new Date().toISOString(),
            status: "Pending",
            notes: `Invoice for ${additionalSpots} additional parking spots at $${costPerSpot}/spot.`
        });
        
        toast({
            title: "Invoice Generated",
            description: `An invoice for $${invoiceAmount} has been created for ${vendor.name}.`,
        });

        router.push(`/super-admin/vendors/${vendor.id}/invoices`);
    }

  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adjust Spot Limit for {vendor.name}</DialogTitle>
          <DialogDescription>
            Current usage: {vendor.spotsUsed || 0} / {vendor.spotLimit}. Each additional spot costs $10 and will be invoiced immediately.
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
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSave}>
            Save and Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
