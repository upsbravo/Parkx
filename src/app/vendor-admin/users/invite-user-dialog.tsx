

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
import { useFirestore, useUser, addDocumentNonBlocking } from "@/firebase";
import { doc, setDoc, serverTimestamp, collection } from "firebase/firestore";
import { useState } from "react";
import { getAuth, createUserWithEmailAndPassword, deleteUser, updateProfile } from "firebase/auth";
import { initializeApp, deleteApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function InviteUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: vendorAdmin } = useUser();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("due_on_receipt");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateUser = async () => {
    if (!firstName || !lastName || !email || !password) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill out all required fields.",
      });
      return;
    }
    if (!vendorAdmin) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "You must be logged in as a Vendor Admin to create a user.",
        });
        return;
    }
    setIsLoading(true);

    const tempAppName = `temp-user-creation-${Date.now()}`;
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);
    let newUser;


    try {
      // 1. Create the user in the temporary Auth instance
      const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
      newUser = userCredential.user;
      
      await updateProfile(newUser, { displayName: `${firstName} ${lastName}` });


      // 2. Create the user document in the top-level /users collection
      const userDocRef = doc(firestore, "users", newUser.uid);
      await setDoc(userDocRef, {
        id: newUser.uid,
        vendorId: vendorAdmin.uid,
        firstName: firstName,
        lastName: lastName,
        email: email,
        status: "Active",
        assignedSpotId: null,
        role: "endUser",
        profileComplete: false, // <-- New field
        waiverSigned: false, // <-- New field
        paymentTerms: paymentTerms,
      });

      // 3. (Optional but good practice) Notify Super Admin
      // This requires knowing the super admin's UID or having a dedicated notifications collection.
      // For now, we'll skip this to avoid complexity, but it could be added.

      toast({
        title: "User Created!",
        description: `${firstName} ${lastName} can now log in.`,
      });

      // Reset form and close dialog
      onOpenChange(false);
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setPaymentTerms("due_on_receipt");

    } catch (error: any) {
      console.error("Error creating user: ", error);
       // If Auth user was created but Firestore failed, we should clean up the auth user.
       if (newUser) {
        await deleteUser(newUser);
      }
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: error.message || "There was a problem creating the user account.",
      });
    } finally {
      // 4. Clean up the temporary app instance
      await deleteApp(tempApp);
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Create a new user account for your parking lot. They will be able
            to log in immediately with the temporary password.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first-name">First Name</Label>
              <Input
                id="first-name"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">Last Name</Label>
              <Input
                id="last-name"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Temporary Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Set a temporary password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
              <Label htmlFor="payment-terms">Default Payment Terms</Label>
              <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                <SelectTrigger id="payment-terms">
                    <SelectValue placeholder="Select terms..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="due_on_receipt">Due on receipt</SelectItem>
                    <SelectItem value="net_15">Net 15</SelectItem>
                    <SelectItem value="net_30">Net 30</SelectItem>
                    <SelectItem value="net_60">Net 60</SelectItem>
                </SelectContent>
              </Select>
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
          <Button type="submit" onClick={handleCreateUser} disabled={isLoading}>
            {isLoading ? "Creating..." : "Create User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
