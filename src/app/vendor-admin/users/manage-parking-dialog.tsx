
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
import { useFirestore, useUser, updateDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase";
import { collection, doc, writeBatch } from "firebase/firestore";
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type EndUser = {
  id: string;
  firstName: string;
  lastName: string;
  truckParkingSpots?: number;
  isRecurringPayment?: boolean;
};

const MONTHLY_FEE = 350;
const QUARTERLY_FEE = 1050;

export function ManageParkingDialog({
  user,
  open,
  onOpenChange,
}: {
  user: EndUser;
  open: boolean;
  onOpencha
nge: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: vendorAdmin } = useUser();
  
  const [spots, setSpots] = useState(user.truckParkingSpots || 0);
  const [isRecurring, setIsRecurring] = useState(user.isRecurringPayment || false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "quarterly">("quarterly");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSpots(user.truckParkingSpots || 0);
    setIsRecurring(user.isRecurringPayment || false);
  }, [user]);

  const totalAmount = spots * (billingCycle === 'monthly' ? MONTHLY_FEE : QUARTERLY_FEE);

  const handleSaveAndInvoice = async () => {
    if (!firestore || !vendorAdmin) return;
    setIsSaving(true);

    const batch = writeBatch(firestore);
    
    // 1. Update user document
    const userRef = doc(firestore, "users", user.id);
    batch.update(userRef, {
      truckParkingSpots: spots,
      isRecurringPayment: isRecurring,
    });

    // 2. Create invoice if spots > 0
    if (spots > 0) {
        const invoicesRef = collection(firestore, "vendors", vendorAdmin.uid, "userInvoices");
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30); // Due in 30 days
        
        batch.set(doc(invoicesRef), {
            vendorId: vendorAdmin.uid,
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            amount: totalAmount,
            dueDate: dueDate.toISOString(),
            status: "Pending",
            notes: `Invoice for ${spots} truck spot(s) on a ${billingCycle} basis. Recurring: ${isRecurring ? 'Yes' : 'No'}.`,
        });
    }

    try {
        await batch.commit();
        toast({
            title: "Parking Updated",
            description: `${user.firstName}'s truck parking spots and billing have been updated.`,
        });
        if (spots > 0) {
            toast({
                title: "Invoice Generated",
                description: `An invoice for $${totalAmount} has been created.`,
            });
        }
        onOpenChange(false);
    } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: "Error", description: "Could not save parking details."});
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Truck Parking for {user.firstName}</DialogTitle>
          <DialogDescription>
            Assign spots and generate invoices for large vehicle parking.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
            <div className="space-y-2">
                <Label htmlFor="spots">Number of Truck Spots</Label>
                <Input 
                    id="spots"
                    type="number"
                    value={spots}
                    onChange={(e) => setSpots(Number(e.target.value))}
                    min="0"
                />
            </div>

            <div className="space-y-4">
                <Label>Billing Cycle</Label>
                <RadioGroup value={billingCycle} onValueChange={(value: "monthly" | "quarterly") => setBillingCycle(value)}>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="monthly" id="monthly" />
                        <Label htmlFor="monthly">Monthly ($350 per spot)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="quarterly" id="quarterly" />
                        <Label htmlFor="quarterly">Quarterly ($1050 per spot)</Label>
                    </div>
                </RadioGroup>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                    <Label>Enable Recurring Payments</Label>
                    <p className="text-xs text-muted-foreground">
                        Automatically generate invoices for each billing cycle.
                    </p>
                </div>
                <Switch 
                    checked={isRecurring}
                    onCheckedChange={setIsRecurring}
                />
            </div>
            
            <div className="text-right">
                <Label className="text-muted-foreground">Invoice Total</Label>
                <p className="text-2xl font-bold">${totalAmount.toLocaleString()}</p>
            </div>

        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button type="submit" onClick={handleSaveAndInvoice} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save & Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
