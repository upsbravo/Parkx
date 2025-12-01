
'use client';

import { useState, useMemo } from 'react';
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
import { Check, X, Building, AlertTriangle } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { AdjustSpotLimitDialog } from '../vendors/adjust-spot-limit-dialog';

type Vendor = {
  id: string;
  name: string;
  email: string;
  spotLimit: number;
  spotsUsed: number; // Assuming this is available
  spotLimitRequestDate?: string;
  spotLimitIncreaseRequested: boolean;
};


export default function SuperAdminApprovalsPage() {
  const firestore = useFirestore();
  const { user: superAdmin } = useUser();
  const { toast } = useToast();
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isAdjustOpen, setAdjustOpen] = useState(false);

  const requestsQuery = useMemoFirebase(() => {
    if (!firestore || !superAdmin) return null;
    return query(
      collection(firestore, 'vendors'),
      where('spotLimitIncreaseRequested', '==', true)
    );
  }, [firestore, superAdmin]);

  const { data: spotLimitRequests, isLoading } = useCollection<Vendor>(requestsQuery);
  
  const createNotification = (title: string, message: string, type: 'payment_failure' | 'new_vendor' | 'support_ticket' = 'new_vendor') => {
    if (!superAdmin) return;
    const notifRef = collection(firestore, 'superAdmins', superAdmin.uid, 'notifications');
    addDocumentNonBlocking(notifRef, {
      title,
      message,
      type,
      isRead: false,
      createdAt: serverTimestamp(),
    })
  }

  const handleApprove = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setAdjustOpen(true);
  };
  
  const onDialogClose = (open: boolean) => {
    if (!open) {
      // If the dialog is closing and there was a selected vendor,
      // assume action was taken and reset their request flag.
      if (selectedVendor) {
        const vendorRef = doc(firestore, 'vendors', selectedVendor.id);
        updateDocumentNonBlocking(vendorRef, {
            spotLimitIncreaseRequested: false,
            spotLimitRequestDate: null,
        });
        createNotification('Spot Limit Approved', `Approved request for ${selectedVendor.name}.`, 'new_vendor');
      }
      setSelectedVendor(null);
    }
    setAdjustOpen(open);
  }

  const handleDeny = (vendor: Vendor) => {
    if (!firestore || !superAdmin) return;
    const vendorRef = doc(firestore, 'vendors', vendor.id);
    updateDocumentNonBlocking(vendorRef, {
      spotLimitIncreaseRequested: false,
      spotLimitRequestDate: null,
    });
     toast({
        title: 'Request Denied',
        description: `${vendor.name}'s request for more spots has been denied.`,
      });
    createNotification('Spot Limit Denied', `Denied request for ${vendor.name}.`, 'new_vendor');
  };

  return (
    <>
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Approvals</h1>
        <p className="text-muted-foreground">
          Review and take action on pending requests from vendors.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Spot Limit Increase Requests</CardTitle>
          </div>
          <CardDescription>
            Approve or deny requests from vendors to increase their total number of parking spots.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Current Limit</TableHead>
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
              ) : spotLimitRequests && spotLimitRequests.length > 0 ? (
                spotLimitRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Building className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {request.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {request.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {request.spotLimit}
                    </TableCell>
                    <TableCell>
                      {request.spotLimitRequestDate
                        ? new Date(
                            request.spotLimitRequestDate
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
                    No pending spot limit requests.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    {selectedVendor && (
        <AdjustSpotLimitDialog
          vendor={selectedVendor}
          open={isAdjustOpen}
          onOpenChange={onDialogClose}
        />
      )}
    </>
  );
}
