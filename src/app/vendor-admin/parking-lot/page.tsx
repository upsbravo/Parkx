'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trash2 } from 'lucide-react';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

type Vendor = {
  spotLimit: number;
};

type EndUser = {
    id: string;
    firstName: string;
    lastName: string;
}

type ParkingSpot = {
    id: string;
    name: string;
    isAvailable: boolean;
    userId: string | null;
}

export default function ParkingLotPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [newSpotName, setNewSpotName] = useState('');

  const vendorRef = useMemoFirebase(
    () => (user ? doc(firestore, 'vendors', user.uid) : null),
    [user, firestore]
  );
  const { data: vendorData, isLoading: isVendorLoading } = useDoc<Vendor>(vendorRef);

  const spotsCollectionRef = useMemoFirebase(
    () => (user ? collection(firestore, 'vendors', user.uid, 'parkingSpots') : null),
    [user, firestore]
  );
  const { data: parkingSpots, isLoading: areSpotsLoading } = useCollection<ParkingSpot>(spotsCollectionRef);

  const usersCollectionRef = useMemoFirebase(
    () => (user ? collection(firestore, 'users') : null),
    [user, firestore]
  );
  const { data: endUsers, isLoading: areUsersLoading } = useCollection<EndUser>(usersCollectionRef);

  const isLoading = isUserLoading || isVendorLoading || areSpotsLoading || areUsersLoading;

  const totalSpots = vendorData?.spotLimit ?? 0;
  const usedSpots = parkingSpots?.filter((spot) => !spot.isAvailable).length ?? 0;

  const getUserName = (userId: string | null) => {
    if (!userId || !endUsers) return 'Unassigned';
    const user = endUsers.find((user) => user.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : 'Unknown User';
  };
  
  const handleAddSpot = async () => {
    if (!newSpotName) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a name for the new spot.' });
      return;
    }
    if (!user || !spotsCollectionRef) return;
    
    if (parkingSpots && parkingSpots.length >= totalSpots) {
        toast({ variant: 'destructive', title: 'Spot Limit Reached', description: 'You have reached your spot limit. Contact the super admin to increase it.' });
        return;
    }

    try {
      await addDocumentNonBlocking(spotsCollectionRef, {
        name: newSpotName,
        isAvailable: true,
        userId: null,
        vendorId: user.uid,
      });
      toast({ title: 'Spot Added', description: `Spot "${newSpotName}" has been created.` });
      setNewSpotName('');
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not add the spot.' });
    }
  };

  const handleDeleteSpot = (spotId: string) => {
    if (!user) return;
    const spotRef = doc(firestore, 'vendors', user.uid, 'parkingSpots', spotId);
    deleteDocumentNonBlocking(spotRef);
    toast({ variant: 'destructive', title: 'Spot Deleted', description: 'The parking spot has been removed.' });
  };


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Parking Lot Setup
        </h1>
        <p className="text-muted-foreground">
          View spot assignments and manage your lot layout.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manage Spots</CardTitle>
          <CardDescription>
            Add, remove, or rename your parking spots and see who they are
            assigned to.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <Label>Spot Usage</Label>
              {isLoading ? (
                  <Skeleton className="h-5 w-20" />
              ) : (
                <span>
                    {usedSpots} / {totalSpots}
                </span>
              )}
            </div>
            <Progress value={isLoading ? 0 : (usedSpots / totalSpots) * 100} />
          </div>

          <div className="flex w-full max-w-sm items-center space-x-2">
            <Input 
                type="text" 
                placeholder="New Spot Name (e.g., D1)" 
                value={newSpotName} 
                onChange={(e) => setNewSpotName(e.target.value)}
                disabled={isLoading}
            />
            <Button type="button" onClick={handleAddSpot} disabled={isLoading}>Add Spot</Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Spot Name</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead className="w-[100px] text-right">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-8 inline-block" /></TableCell>
                        </TableRow>
                    ))
                ) : parkingSpots && parkingSpots.length > 0 ? (
                  parkingSpots.map((spot) => (
                    <TableRow key={spot.id}>
                      <TableCell className="font-medium">{spot.name}</TableCell>
                      <TableCell>{getUserName(spot.userId)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteSpot(spot.id)} disabled={!spot.isAvailable}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center">
                            No spots created yet. Add one above to get started.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
