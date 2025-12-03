
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
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import { getAuth, createUserWithEmailAndPassword, deleteUser } from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";
import { firebaseConfig } from "@/firebase/config";
import { createStripeCustomer } from "@/ai/flows/create-stripe-customer-flow";
import { createStripeAccount } from "@/ai/flows/create-stripe-account-flow";
import { Switch } from "@/components/ui/switch";


export function InviteVendorDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [spotLimit, setSpotLimit] = useState(20);
  const [offerTrial, setOfferTrial] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateVendor = async () => {
    if (!email || !password || !name) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill out all required fields.",
      });
      return;
    }
    setIsLoading(true);

    const tempAppName = `temp-vendor-creation-${Date.now()}`;
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);
    let newUser;
    let stripeCustomerId;
    let stripeAccountId;

    try {
      // Step 1: Create user in the temporary auth instance
      const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
      newUser = userCredential.user;

      // Step 2: Create Stripe Customer (for billing the vendor)
      const stripeCustomerResult = await createStripeCustomer({ email, name });
      if (stripeCustomerResult.error || !stripeCustomerResult.customerId) {
        throw new Error(stripeCustomerResult.error || "Failed to create Stripe customer.");
      }
      stripeCustomerId = stripeCustomerResult.customerId;
      
      // Step 3: Create Stripe Connected Account (for paying out the vendor)
      const stripeAccountResult = await createStripeAccount({ email, uid: newUser.uid });
      if (stripeAccountResult.error || !stripeAccountResult.accountId) {
          throw new Error(stripeAccountResult.error || "Failed to create Stripe Connected Account.");
      }
      stripeAccountId = stripeAccountResult.accountId;

      // Step 4: Create the vendor document in Firestore with all necessary IDs
      // The vendor's doc ID *is* their Firebase UID.
      await setDoc(doc(firestore, "vendors", newUser.uid), {
        id: newUser.uid,
        name: name,
        email: email,
        status: "Pending Agreement",
        joinDate: new Date().toISOString(),
        trialEnds: null,
        spotsUsed: 0,
        spotLimit: spotLimit,
        role: "vendorAdmin",
        stripeCustomerId: stripeCustomerId,
        stripeAccountId: stripeAccountId, // Storing the correct Stripe Account ID
        profileComplete: false,
        agreementSigned: false,
        trialOffered: offerTrial,
      });

      // Step 5: Create the customer document for the Stripe extension
      const customerRef = doc(firestore, 'customers', newUser.uid);
      await setDoc(customerRef, {
        email: email,
        name: name,
        stripeId: stripeCustomerId,
      });

      toast({
        title: "Vendor Created!",
        description: `${name} has been created. They must complete their profile and sign the master agreement on first login.`,
      });
      
      onOpenChange(false);
      setName("");
      setEmail("");
      setPassword("");
      setSpotLimit(20);
      setOfferTrial(true);

    } catch (error: any) {
      console.error("Error creating vendor: ", error);
      if (newUser) {
        await deleteUser(newUser).catch(e => console.error("Cleanup of auth user failed:", e));
      }
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: error.message || "There was a problem creating the vendor account.",
      });
    } finally {
      await deleteApp(tempApp).catch(e => console.error("Cleanup of temp app failed:", e));
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Vendor</DialogTitle>
          <DialogDescription>
            Create a new vendor account. They will be required to complete their profile and sign the master agreement on first login.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Vendor Name</Label>
            <Input
              id="name"
              placeholder="Acme Parking Inc."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="vendor@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
           <div className="space-y-2">
            <Label htmlFor="password">Temp Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Set a temporary password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
           <div className="space-y-2">
            <Label htmlFor="spot-limit">Spot Limit</Label>
            <Input
              id="spot-limit"
              type="number"
              value={spotLimit}
              onChange={(e) => setSpotLimit(Number(e.target.value))}
            />
          </div>
           <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label>Offer 30-Day Trial?</Label>
              <p className="text-xs text-muted-foreground">
                If off, the vendor will be charged immediately upon signup.
              </p>
            </div>
            <Switch
              checked={offerTrial}
              onCheckedChange={setOfferTrial}
              aria-label="Toggle trial offer"
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
          <Button type="submit" onClick={handleCreateVendor} disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Vendor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
