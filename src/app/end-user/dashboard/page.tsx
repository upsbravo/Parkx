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
  vendorId: string;
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

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  
  const {data: userData, isLoading: isUserDocLoading} = useDoc<EndUser>(userDocRef);
  
  const spotDocRef = useMemoFirebase(() => {
    if (!firestore || !userData?.assignedSpotId || !userData?.vendorId) return null;
    return doc(firestore, 'vendors', userData.vendorId, 'parkingSpots', userData.assignedSpotId);
  }, [firestore, userData]);

  const { data: spotData, isLoading: isSpotLoading } = useDoc<ParkingSpot>(spotDocRef);


  const handleRequestCancellation = () => {
      if (!userDocRef) return;

      updateDocumentNonBlocking(userDocRef, {
        cancellationRequested: true,
        cancellationRequestDate: new Date().toISOString(),
      });
      toast({
        title: 'Cancellation Requested',
        description: 'Your request has been sent to the administrator for approval.',
      });
  };
  
  const handleWithdrawCancellation = () => {
    if (!userDocRef) return;
     updateDocumentNonBlocking(userDocRef, {
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
