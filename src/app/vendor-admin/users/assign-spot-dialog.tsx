
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
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc, addDocumentNonBlocking } from "@/firebase";
import { collection, doc, query, where, writeBatch } from "firebase/firestore";
import { useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";

type EndUser = {
  id: string;
  firstName: string;
  lastName: string;
  assignedSpotId: string | null;
  waiverSigned?: boolean;
};

type ParkingSpot = {
  id: string;
  name: string;
};

export function AssignSpotDialog({
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
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(user.assignedSpotId);
  const [isSaving, setIsSaving] = useState(false);

  const spotsQuery = useMemoFirebase(() => {
    if (!firestore || !vendorAdmin) return null;
    return query(
      collection(firestore, "vendors", vendorAdmin.uid, "parkingSpots"),
      where("isAvailable", "==", true)
    );
  }, [firestore, vendorAdmin]);
  const { data: availableSpots, isLoading: isLoadingSpots } = useCollection<ParkingSpot>(spotsQuery);
  
  const currentSpotRef = useMemoFirebase(() => {
      if(!firestore || !vendorAdmin || !user.assignedSpotId) return null;
      return doc(firestore, "vendors", vendorAdmin.uid, "parkingSpots", user.assignedSpotId);
  }, [firestore, vendorAdmin, user.assignedSpotId]);
  const { data: currentSpot, isLoading: isLoadingCurrentSpot } = useDoc<ParkingSpot>(currentSpotRef);

  const allSpots = useMemo(() => {
    let spots = availableSpots ? [...availableSpots] : [];
    if(currentSpot && !spots.some(s => s.id === currentSpot.id)) {
        spots = [...spots, currentSpot];
    }
    return spots.sort((a,b) => a.name.localeCompare(b.name));
  }, [availableSpots, currentSpot]);


  const handleSave = async () => {
    if (!firestore || !vendorAdmin) return;
    
    if (!user.waiverSigned) {
      toast({
        variant: "destructive",
        title: "Cannot Assign Spot",
        description: "The user must sign the parking agreement before being assigned a spot.",
      });
      return;
    }

    if (selectedSpotId === user.assignedSpotId) {
        toast({ title: "No Change", description: "The spot assignment was not changed." });
        onOpenChange(false);
        return;
    }

    setIsSaving(true);
    
    const batch = writeBatch(firestore);
    const userRef = doc(firestore, "users", user.id);

    const oldSpotName = currentSpot?.name || 'Unassigned';
    const newSpot = allSpots.find(s => s.id === selectedSpotId);
    const newSpotName = newSpot?.name || 'Unassigned';

    // Case 1: Un-assigning the current spot
    if (user.assignedSpotId && !selectedSpotId) {
        const oldSpotRef = doc(firestore, "vendors", vendorAdmin.uid, "parkingSpots", user.assignedSpotId);
        batch.update(oldSpotRef, { isAvailable: true, userId: null });
        batch.update(userRef, { assignedSpotId: null });
    }
    // Case 2: Assigning a new spot (or changing spots)
    else if (selectedSpotId && selectedSpotId !== user.assignedSpotId) {
        // Make old spot available if there was one
        if (user.assignedSpotId) {
            const oldSpotRef = doc(firestore, "vendors", vendorAdmin.uid, "parkingSpots", user.assignedSpotId);
            batch.update(oldSpotRef, { isAvailable: true, userId: null });
        }
        // Assign new spot
        const newSpotRef = doc(firestore, "vendors", vendorAdmin.uid, "parkingSpots", selectedSpotId);
        batch.update(newSpotRef, { isAvailable: false, userId: user.id });
        batch.update(userRef, { assignedSpotId: selectedSpotId });
    }

    // Create a document for the change
    const docContent = `
PARKING SPOT ASSIGNMENT CHANGE RECORD
-------------------------------------
Date of Change: ${new Date().toLocaleString()}

User: ${user.firstName} ${user.lastName} (ID: ${user.id})

PREVIOUS ASSIGNMENT:
Spot: ${oldSpotName}

NEW ASSIGNMENT:
Spot: ${newSpotName}

This document confirms the change in parking spot assignment as requested or administered.
    `.trim();

    const docsRef = collection(firestore, 'vendors', vendorAdmin.uid, 'userDocuments');
    addDocumentNonBlocking(docsRef, {
        userId: user.id,
        vendorId: vendorAdmin.uid,
        name: `Spot Change Record - ${new Date().toLocaleDateString()}`,
        content: docContent,
        createdAt: new Date().toISOString(),
    });


    try {
        await batch.commit();
        toast({
            title: "Parking Spot Assigned",
            description: `${user.firstName} ${user.lastName} has been assigned to spot ${newSpotName}.`,
        });
        toast({
            title: "Document Created",
            description: "A record of the spot change has been saved.",
        });
        onOpenChange(false);
    } catch(e) {
        console.error(e);
        toast({ variant: 'destructive', title: "Error", description: "Could not save spot assignment."});
    } finally {
        setIsSaving(false);
    }
  };

  const isLoading = isLoadingSpots || isLoadingCurrentSpot;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Spot to {user.firstName}</DialogTitle>
          <DialogDescription>
            Select an available spot. This will generate a record of the change.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
            <Label htmlFor="spot-select">Available Spots</Label>
            {isLoading ? (
                <Skeleton className="h-10 w-full" />
            ): (
            <Select
                value={selectedSpotId || 'unassigned'}
                onValueChange={(value) => setSelectedSpotId(value === 'unassigned' ? null : value)}
            >
                <SelectTrigger id="spot-select">
                <SelectValue placeholder="Select a spot..." />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {allSpots.map((spot) => (
                    <SelectItem key={spot.id} value={spot.id}>
                    {spot.name}
                    </SelectItem>
                ))}
                </SelectContent>
            </Select>
            )}
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
          <Button type="submit" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Assignment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

