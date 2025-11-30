
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
import { useFirestore, useAuth } from "@/firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import { getAuth, createUserWithEmailAndPassword, deleteUser } from "firebase/auth";
import { Checkbox } from "@/components/ui/checkbox";
import { initializeApp, deleteApp } from "firebase/app";
import { firebaseConfig } from "@/firebase/config";


export function InviteVendorDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const mainAuth = useAuth(); // Use the main auth instance
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [spotLimit, setSpotLimit] = useState(20);
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


    try {
      // Create user in the temporary auth instance
      const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
      newUser = userCredential.user;

      // Create a document in the `customers` collection.
      // This will trigger the Stripe extension to create a Stripe Customer object.
      const customerRef = doc(firestore, 'customers', newUser.uid);
      await setDoc(customerRef, {
        email: email,
        name: name,
      });

      // Now create the vendor document in Firestore with the new user's UID using the main firestore instance
      await setDoc(doc(firestore, "vendors", newUser.uid), {
        name: name,
        email: email,
        status: "Pending Agreement", // Set initial status to require agreement
        joinDate: new Date().toISOString(),
        trialEnds: null, // Trial starts after agreement
        spotsUsed: 0,
        spotLimit: spotLimit,
        id: newUser.uid,
        role: "vendorAdmin",
        stripeCustomerId: null
      });

      toast({
        title: "Vendor Created!",
        description: `${name} has been created. They must sign the agreement on first login.`,
      });
      
      // Reset form and close dialog
      onOpenChange(false);
      setName("");
      setEmail("");
      setPassword("");
      setSpotLimit(20);
    } catch (error: any) {
      console.error("Error creating vendor: ", error);
      // If user was created in Auth but Firestore failed, we should clean up.
      if (newUser) {
        await deleteUser(newUser);
      }
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: error.message || "There was a problem creating the vendor account.",
      });
    } finally {
      // Cleanup the temporary app
      await deleteApp(tempApp);
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Vendor</DialogTitle>
          <DialogDescription>
            Create a new vendor account. They will be required to sign the master agreement on first login.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Vendor Name
            </Label>
            <Input
              id="name"
              placeholder="Acme Parking Inc."
              className="col-span-3"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
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
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="password" className="text-right">
              Temp Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Set a temporary password"
              className="col-span-3"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="spot-limit" className="text-right">
              Spot Limit
            </Label>
            <Input
              id="spot-limit"
              type="number"
              className="col-span-3"
              value={spotLimit}
              onChange={(e) => setSpotLimit(Number(e.target.value))}
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
