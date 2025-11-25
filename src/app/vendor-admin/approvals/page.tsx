'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Check, X } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';

type EndUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  assignedSpotId: string | null;
  cancellationRequested: boolean;
  cancellationRequestDate?: string; // ISO string
};

type ParkingSpot = {
    id: string;
    name: string;
    isAvailable: boolean;
    userId: string | null;
}

export default function ApprovalsPage() {
  const firestore = useFirestore();
  const { user: vendorAdmin } = useUser();
  const { toast } = useToast();

  const requestsQuery = useMemoFirebase(() => {
    if (!firestore || !vendorAdmin) return null;
    return query(
      collection(firestore, 'vendors', vendorAdmin.uid, 'endUsers'),
      where('cancellationRequested', '==', true)
    );
  }, [firestore, vendorAdmin]);

  const { data: cancellationRequests, isLoading } = useCollection<EndUser>(requestsQuery);

  const handleApprove = async (request: EndUser) => {
    if (!firestore || !vendorAdmin || !request.assignedSpotId) return;

    const batch = writeBatch(firestore);

    // 1. Update the user
    const userRef = doc(firestore, 'vendors', vendorAdmin.uid, 'endUsers', request.id);
    batch.update(userRef, {
      assignedSpotId: null,
      cancellationRequested: false,
      cancellationRequestDate: null,
      status: 'Inactive',
    });

    // 2. Update the parking spot
    const spotRef = doc(firestore, 'vendors', vendorAdmin.uid, 'parkingSpots', request.assignedSpotId);
    batch.update(spotRef, {
        isAvailable: true,
        userId: null,
    });
    
    try {
        await batch.commit();
        toast({
            title: 'Cancellation Approved',
            description: `${request.firstName} ${request.lastName}'s spot is now available.`,
        });
    } catch(e) {
        console.error(e);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not approve cancellation.',
        });
    }
  };

  const handleDeny = (request: EndUser) => {
    if (!firestore || !vendorAdmin) return;
    const userRef = doc(firestore, 'vendors', vendorAdmin.uid, 'endUsers', request.id);
    updateDocumentNonBlocking(userRef, {
      cancellationRequested: false,
      cancellationRequestDate: null,
    });
     toast({
        title: 'Cancellation Denied',
        description: `${request.firstName} ${request.lastName}'s cancellation request has been denied.`,
      });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Approvals</h1>
        <p className="text-muted-foreground">
          Approve or deny pending requests from users.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <ArrowRight className="h-5 w-5 text-muted-foreground -rotate-45" />
            <CardTitle>Pending Cancellations</CardTitle>
          </div>
          <CardDescription>
            Review requests from users to vacate their spots. Approving will make the spot available.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Spot to Vacate</TableHead>
                <TableHead>Request Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ) : cancellationRequests && cancellationRequests.length > 0 ? (
                cancellationRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={`https://picsum.photos/seed/${request.id}/40/40`} />
                          <AvatarFallback>
                            {request.firstName?.[0]}
                            {request.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {request.firstName} {request.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {request.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{request.assignedSpotId || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell>
                      {request.cancellationRequestDate
                        ? new Date(
                            request.cancellationRequestDate
                          ).toLocaleDateString()
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                       <Button size="sm" variant="outline" onClick={() => handleDeny(request)}>
                        <X className="mr-2 h-4 w-4" />
                        Deny
                      </Button>
                      <Button size="sm" onClick={() => handleApprove(request)}>
                        <Check className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No pending cancellation requests.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
