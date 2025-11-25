'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle, ParkingSquare, Ban } from 'lucide-react';
import { useDoc, useFirestore, useMemoFirebase, useUser, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

type EndUser = {
  id: string;
  firstName: string;
  lastName: string;
  assignedSpotId: string | null;
  cancellationRequested?: boolean;
};

type ParkingSpot = {
    id: string;
    name: string;
}

export default function EndUserDashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  // Find the user's document path is tricky. For now, assuming we can find it.
  // In a real app, this might come from a context or a more direct query.
  // This hook is just a placeholder for the logic to find the user's doc ref.
  const userDocRef = useMemoFirebase(() => {
      // This is a simplified lookup. A real app would need a more robust way
      // to find which vendor subcollection the user belongs to.
      // For this demo, we'll assume the user's vendor ID is known or stored somewhere.
      // Let's pretend it's in user.customClaims or we query for it.
      if (!user || !firestore) return null;
      // This is still a guess. In a real app, you MUST know the vendorId.
      // For now, this will not work unless we hardcode a vendorId or find it.
      // Let's assume we can't find it for now and handle the UI.
      return null; // This will be updated in a future step.
  }, [user, firestore]);
  
  // This is a temporary solution for the demo.
  // We'll replace this with a proper lookup.
  const {data: userData, isLoading: isUserDocLoading} = useDoc<EndUser>(user?.uid ? doc(firestore, 'vendors/YQadS5yQ5EXD2w5zmvqP/endUsers', user.uid) : null);
  
  const spotDocRef = useMemoFirebase(() => {
    if (!firestore || !userData?.assignedSpotId) return null;
    return doc(firestore, 'vendors/YQadS5yQ5EXD2w5zmvqP/parkingSpots', userData.assignedSpotId);
  }, [firestore, userData]);
  const { data: spotData, isLoading: isSpotLoading } = useDoc<ParkingSpot>(spotDocRef);


  const handleRequestCancellation = () => {
      if (!user) return;
      // We need the *actual* ref to the user doc.
      const actualUserDocRef = doc(firestore, 'vendors/YQadS5yQ5EXD2w5zmvqP/endUsers', user.uid);

      updateDocumentNonBlocking(actualUserDocRef, {
        cancellationRequested: true,
        cancellationRequestDate: new Date().toISOString(),
      });
      toast({
        title: 'Cancellation Requested',
        description: 'Your request has been sent to the administrator for approval.',
      });
  };
  
  const handleWithdrawCancellation = () => {
    if (!user) return;
    const actualUserDocRef = doc(firestore, 'vendors/YQadS5yQ5EXD2w5zmvqP/endUsers', user.uid);
     updateDocumentNonBlocking(actualUserDocRef, {
        cancellationRequested: false,
        cancellationRequestDate: null,
      });
      toast({
        title: 'Request Withdrawn',
        description: 'Your cancellation request has been withdrawn.',
      });
  };
  
  const isLoading = isUserLoading || isUserDocLoading || isSpotLoading;


  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome, {isLoading ? <Skeleton className="h-8 w-32 inline-block"/> : userData?.firstName}</h1>
        <p className="text-muted-foreground">
          Manage your assigned spot and view recent activity.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ParkingSquare className="h-6 w-6 text-primary" />
              <CardTitle>Current Spot</CardTitle>
            </div>
            <CardDescription>
              Details about your currently assigned parking spot.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
                <div className="space-y-2">
                    <Skeleton className="h-14 w-24" />
                    <Skeleton className="h-4 w-40" />
                </div>
            ) : spotData ? (
              <>
                <div className="space-y-1">
                  <p className="text-5xl font-bold">{spotData.name}</p>
                  <p className="text-muted-foreground">Assigned to you</p>
                </div>

                {userData?.cancellationRequested ? (
                     <Button variant="secondary" onClick={handleWithdrawCancellation}>
                        <Ban className="mr-2 h-4 w-4" />
                        Withdraw Cancellation Request
                    </Button>
                ) : (
                    <Button variant="destructive" onClick={handleRequestCancellation}>
                        <ArrowRight className="mr-2 h-4 w-4 -scale-x-100" />
                        Request Cancellation
                    </Button>
                )}
              </>
            ) : (
                 <div className="text-center text-muted-foreground py-8">
                    You do not have a spot assigned.
                </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="flex h-32 items-center justify-center">
                 <p className="text-sm text-muted-foreground">No recent activity.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
