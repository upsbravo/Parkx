
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { doc } from "firebase/firestore";

type EndUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  assignedSpotId: string | null;
  vehiclePhotoUrl?: string;
  licensePlatePhotoUrl?: string;
};

export function UserDetailsDialog({
  user,
  open,
  onOpenChange,
}: {
  user: EndUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const firestore = useFirestore();
  const { user: vendorAdmin } = useUser();

  const userRef = useMemoFirebase(() => {
    if (!firestore || !vendorAdmin) return null;
    return doc(firestore, "vendors", vendorAdmin.uid, "endUsers", user.id);
  }, [firestore, vendorAdmin, user.id]);

  const { data: userData, isLoading } = useDoc<EndUser>(userRef);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
          <DialogDescription>
            Full profile information for {user.firstName} {user.lastName}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-2/4" />
              <Skeleton className="h-5 w-3/5" />
            </div>
          ) : userData ? (
            <div className="text-sm">
              <div className="flex justify-between border-b py-2">
                <span className="text-muted-foreground">Full Name</span>
                <span className="font-medium">{userData.firstName} {userData.lastName}</span>
              </div>
              <div className="flex justify-between border-b py-2">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{userData.email}</span>
              </div>
              <div className="flex justify-between border-b py-2">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium">{userData.phone || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b py-2">
                <span className="text-muted-foreground">Address</span>
                <span className="font-medium text-right">
                    {userData.address ? `${userData.address.street}, ${userData.address.city}, ${userData.address.state} ${userData.address.zip}` : 'N/A'}
                </span>
              </div>
               <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Assigned Spot</span>
                <span className="font-medium">{userData.assignedSpotId || 'N/A'}</span>
              </div>
            </div>
          ) : (
             <p className="text-muted-foreground">Could not load user details.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
