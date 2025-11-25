
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
  const [limit, setLimit] = useState(vendor.spotLimit);

  const handleSave = () => {
    if (limit < (vendor.spotsUsed || 0)) {
        toast({
            variant: "destructive",
            title: "Invalid Limit",
            description: "New limit cannot be less than the number of spots currently in use.",
        });
        return;
    }

    const vendorRef = doc(firestore, "vendors", vendor.id);
    updateDocumentNonBlocking(vendorRef, { spotLimit: limit });

    toast({
      title: "Spot Limit Updated",
      description: `${vendor.name}'s spot limit has been changed to ${limit}.`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adjust Spot Limit for {vendor.name}</DialogTitle>
          <DialogDescription>
            Current usage: {vendor.spotsUsed || 0} / {vendor.spotLimit}
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
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
