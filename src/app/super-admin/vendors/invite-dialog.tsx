
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
import { collection, doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";

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

    try {
      // We need a separate auth instance to create a user without logging out the current admin
      const auth = getAuth();
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Now create the vendor document in Firestore with the new user's UID
      await setDoc(doc(firestore, "vendors", user.uid), {
        name: name,
        email: email,
        status: "Active",
        joinDate: new Date().toISOString(),
        trialEnds: null,
        spotsUsed: 0,
        spotLimit: spotLimit,
        id: user.uid,
        role: "vendorAdmin", // Explicitly set the role
      });

      toast({
        title: "Vendor Created!",
        description: `${name} can now log in with the temporary password.`,
      });
      onOpenChange(false);
      setName("");
      setEmail("");
      setPassword("");
      setSpotLimit(20);
    } catch (error: any) {
      console.error("Error creating vendor: ", error);
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: error.message || "There was a problem creating the vendor account.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Vendor</DialogTitle>
          <DialogDescription>
            Create a new vendor account with a minimum of 20 spots. They can log in immediately and should
            change their password.
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
              min={20}
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
