'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDoc, useFirestore, useMemoFirebase, useUser, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
};

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const { user: vendorAdmin } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isDataLoading, setIsDataLoading] = useState(true);
  const [formData, setFormData] = useState<Partial<EndUser>>({});
  const [isDeleteAlertOpen, setDeleteAlertOpen] = useState(false);

  const userDocRef = useMemoFirebase(
    () => (firestore && vendorAdmin && userId ? doc(firestore, 'vendors', vendorAdmin.uid, 'endUsers', userId) : null),
    [firestore, vendorAdmin, userId]
  );
  
  const { data: userData, isLoading: isUserDocLoading } = useDoc<EndUser>(userDocRef);

  useEffect(() => {
    if (userData) {
      setFormData(userData);
      setIsDataLoading(false);
    }
  }, [userData]);

  const handleInputChange = (field: keyof EndUser, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleAddressChange = (field: string, value: string) => {
      setFormData(prev => ({ ...prev, address: { ...prev.address, [field]: value } }));
  }

  const handleSaveChanges = async () => {
    if (!userDocRef) return;
    try {
        await updateDocumentNonBlocking(userDocRef, formData);
        toast({ title: 'Success', description: 'User profile has been updated.' });
    } catch (error) {
        console.error('Failed to save changes:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save changes.' });
    }
  };
  
  const handleDeleteUser = async () => {
    if (!userDocRef) return;
    try {
        await deleteDocumentNonBlocking(userDocRef);
        toast({ variant: 'destructive', title: 'User Deleted', description: `${formData.firstName} ${formData.lastName} has been removed.` });
        router.push('/vendor-admin/users');
    } catch (error) {
        console.error('Failed to delete user:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete user.' });
    }
  };


  const isLoading = isDataLoading || isUserDocLoading;

  return (
    <>
    <div className="space-y-6">
       <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
                <Link href="/vendor-admin/users">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
            </Button>
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    Edit User Profile
                </h1>
                <p className="text-muted-foreground">
                    Manage profile details for {isLoading ? '...' : `${formData.firstName} ${formData.lastName}`}
                </p>
            </div>
        </div>
      
      <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
             {isLoading ? (
                Array.from({length: 6}).map((_, i) => <Skeleton key={i} className="h-14 w-full"/>)
             ) : (
                <>
                    <div className="space-y-2">
                        <Label htmlFor="first-name">First Name</Label>
                        <Input id="first-name" value={formData.firstName || ''} onChange={(e) => handleInputChange('firstName', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="last-name">Last Name</Label>
                        <Input id="last-name" value={formData.lastName || ''} onChange={(e) => handleInputChange('lastName', e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" type="email" value={formData.email || ''} readOnly disabled />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" type="tel" value={formData.phone || ''} onChange={(e) => handleInputChange('phone', e.target.value)} />
                    </div>
                </>
             )}
          </CardContent>
        </Card>


        <Card>
          <CardHeader>
            <CardTitle>Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>
            ) : (
                <>
                    <div className="space-y-2">
                        <Label htmlFor="street-address">Street Address</Label>
                        <Input id="street-address" value={formData.address?.street || ''} onChange={(e) => handleAddressChange('street', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="city">City</Label>
                            <Input id="city" value={formData.address?.city || ''} onChange={(e) => handleAddressChange('city', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="state">State / Province</Label>
                            <Input id="state" value={formData.address?.state || ''} onChange={(e) => handleAddressChange('state', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="zip">Zip / Postal Code</Label>
                            <Input id="zip" value={formData.address?.zip || ''} onChange={(e) => handleAddressChange('zip', e.target.value)} />
                        </div>
                    </div>
                </>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button onClick={handleSaveChanges}>Save All Changes</Button>
            <Button variant="destructive" onClick={() => setDeleteAlertOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete User
            </Button>
          </CardFooter>
        </Card>
    </div>
    <AlertDialog open={isDeleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user
              and their associated data. The user will no longer be able to log in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive hover:bg-destructive/90"
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
