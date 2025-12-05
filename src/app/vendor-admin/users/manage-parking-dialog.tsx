
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
import { useFirestore, useUser, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { collection, doc, writeBatch } from "firebase/firestore";
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { createStripeCheckout } from "@/ai/flows/create-stripe-checkout-flow";
import { useRouter } from "next/navigation";


type EndUser = {
  id: string;
  firstName: string;
  lastName: string;
  truckParkingSpots?: number;
  isRecurringPayment?: boolean;
  stripeCustomerId?: string; // Assume user might have a Stripe Customer ID
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
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: vendorAdmin } = useUser();
  const router = useRouter();
  
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
    
    // Update user document first
    const userRef = doc(firestore, "users", user.id);
    await updateDocumentNonBlocking(userRef, {
      truckParkingSpots: spots,
      isRecurringPayment: isRecurring,
    });
    
    if (spots <= 0) {
      toast({ title: "Parking Updated", description: "Truck parking spots have been set to zero." });
      onOpenChange(false);
      setIsSaving(false);
      return;
    }

    try {
      const priceData: any = {
        currency: 'usd',
        product_data: {
          name: `${billingCycle === 'monthly' ? 'Monthly' : 'Quarterly'} Truck Parking (${spots} spot/s)`,
        },
        unit_amount: (billingCycle === 'monthly' ? MONTHLY_FEE : QUARTERLY_FEE) * 100,
      };

      if (isRecurring) {
        priceData.recurring = {
          interval: billingCycle === 'monthly' ? 'month' : 'quarter',
        };
      }

      const checkoutInput = {
        mode: isRecurring ? 'subscription' : 'payment' as 'subscription' | 'payment',
        line_items: [{
            price_data: priceData,
            quantity: spots,
        }],
        successUrl: `${window.location.origin}/vendor-admin/users?payment=success`,
        cancelUrl: window.location.origin + '/vendor-admin/users',
        customer: user.stripeCustomerId,
        metadata: {
            userId: user.id,
            vendorId: vendorAdmin.uid
        }
      };

      const result = await createStripeCheckout(checkoutInput);

      if (result.url) {
         toast({
            title: "Checkout Link Generated",
            description: "A secure payment link has been created. Share it with the user to complete payment.",
            duration: 10000,
            action: (
              <div className="flex gap-2">
                <Button onClick={() => navigator.clipboard.writeText(result.url || '')}>Copy</Button>
                <Button variant="secondary" onClick={() => window.open(result.url, '_blank')}>Open</Button>
              </div>
            )
        });
        onOpenChange(false);
      } else {
        throw new Error(result.error || "Failed to create checkout session.");
      }

    } catch (e: any) {
      console.error(e);
      toast({ variant: 'destructive', title: "Error", description: e.message || "Could not generate payment link."});
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
                <Label htmlFor="spots">Number of Truck Parks</Label>
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
                        <Label htmlFor="monthly">Monthly (${MONTHLY_FEE} per spot)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="quarterly" id="quarterly" />
                        <Label htmlFor="quarterly">Quarterly (${QUARTERLY_FEE} per spot)</Label>
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
            {isSaving ? "Saving..." : "Save & Generate Link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
