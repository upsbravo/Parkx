
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
import { useCollection, useFirestore, useMemoFirebase, useUser, addDocumentNonBlocking } from "@/firebase";
import { collection, doc, query, writeBatch } from "firebase/firestore";
import { useState, useMemo, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

type EndUser = {
  id: string;
  firstName: string;
  lastName: string;
  assignedSpotIds?: string[];
  waiverSigned?: boolean;
};

type ParkingSpot = {
  id: string;
  name: string;
  userId: string | null;
  isAvailable: boolean;
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
  const [selectedSpotIds, setSelectedSpotIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user.assignedSpotIds) {
      setSelectedSpotIds(user.assignedSpotIds);
    } else {
      setSelectedSpotIds([]);
    }
  }, [user, open]);


  const spotsQuery = useMemoFirebase(() => {
    if (!firestore || !vendorAdmin) return null;
    return query(
      collection(firestore, "vendors", vendorAdmin.uid, "parkingSpots"),
    );
  }, [firestore, vendorAdmin]);
  const { data: allSpots, isLoading: isLoadingSpots } = useCollection<ParkingSpot>(spotsQuery);
  
  const availableSpots = useMemo(() => {
    if (!allSpots) return [];
    // A spot is available if it's not occupied OR if it's occupied by the current user
    return allSpots.filter(spot => spot.isAvailable || spot.userId === user.id);
  }, [allSpots, user.id]);


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

    setIsSaving(true);
    
    const batch = writeBatch(firestore);
    const userRef = doc(firestore, "users", user.id);

    const originalSpots = user.assignedSpotIds || [];
    const spotsToMakeAvailable = originalSpots.filter(id => !selectedSpotIds.includes(id));
    const spotsToOccupy = selectedSpotIds.filter(id => !originalSpots.includes(id));

    // Release old spots
    spotsToMakeAvailable.forEach(spotId => {
        const spotRef = doc(firestore, "vendors", vendorAdmin.uid, "parkingSpots", spotId);
        batch.update(spotRef, { isAvailable: true, userId: null });
    });

    // Assign new spots
    spotsToOccupy.forEach(spotId => {
        const spotRef = doc(firestore, "vendors", vendorAdmin.uid, "parkingSpots", spotId);
        batch.update(spotRef, { isAvailable: false, userId: user.id });
    });
    
    // Update user's assigned spots
    batch.update(userRef, { assignedSpotIds: selectedSpotIds });
    
    // Create the Spot Change Record document
    const spotName = (id: string) => allSpots?.find(s => s.id === id)?.name || 'Unknown';
    const content = `Parking spot assignment updated on ${new Date().toLocaleString()}.
    
- Spots Assigned: ${selectedSpotIds.map(spotName).join(', ') || 'None'}
- Spots Removed: ${spotsToMakeAvailable.map(spotName).join(', ') || 'None'}
    
This is an automated record of changes made by the Vendor Administrator.`;

    const docsRef = collection(firestore, 'vendors', vendorAdmin.uid, 'userDocuments');
    addDocumentNonBlocking(docsRef, {
        userId: user.id,
        vendorId: vendorAdmin.uid,
        name: `Spot Change Record - ${new Date().toLocaleDateString()}`,
        content: content,
        createdAt: new Date().toISOString()
    });


    try {
        await batch.commit();
        toast({
            title: "Parking Spots Updated",
            description: `${user.firstName} ${user.lastName} now has ${selectedSpotIds.length} spot(s). A record has been saved.`,
        });
        onOpenChange(false);
    } catch(e) {
        console.error(e);
        toast({ variant: 'destructive', title: "Error", description: "Could not save spot assignment."});
    } finally {
        setIsSaving(false);
    }
  };
  
  const handleSpotToggle = (spotId: string) => {
    setSelectedSpotIds(prev => 
      prev.includes(spotId) ? prev.filter(id => id !== spotId) : [...prev, spotId]
    );
  };

  const isLoading = isLoadingSpots;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Spot(s) to {user.firstName}</DialogTitle>
          <DialogDescription>
            Select one or more available spots for this user.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
            <Label>Available Spots ({selectedSpotIds.length} selected)</Label>
            <ScrollArea className="h-60 mt-2 w-full rounded-md border p-4">
              {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
              ): availableSpots.length > 0 ? (
                <div className="space-y-2">
                  {availableSpots.map((spot) => (
                    <div key={spot.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`spot-${spot.id}`}
                        checked={selectedSpotIds.includes(spot.id)}
                        onCheckedChange={() => handleSpotToggle(spot.id)}
                      />
                      <label
                        htmlFor={`spot-${spot.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {spot.name}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No available spots.
                </div>
              )}
            </ScrollArea>
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

    