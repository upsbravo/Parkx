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
import {
  useDoc,
  useFirestore,
  useMemoFirebase,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Trash2,
  User,
  MapPin,
  HeartPulse,
  Truck,
  Camera,
  Upload,
  ScanLine,
} from 'lucide-react';
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
import { TextScanner } from '@/components/text-scanner';
import Image from 'next/image';

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
  emergencyContact?: {
    name: string;
    phone: string;
  };
  truckCompanyName?: string;
  truckUnitNumber?: string;
  vinNumber?: string;
  tagNumber?: string;
};

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const firestore = useFirestore();
  const { toast } = useToast();

  const [formData, setFormData] = useState<Partial<EndUser>>({});
  const [isDeleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [isVinScannerOpen, setIsVinScannerOpen] = useState(false);
  const [isTagScannerOpen, setIsTagScannerOpen] = useState(false);

  const userDocRef = useMemoFirebase(
    () => (firestore && userId ? doc(firestore, 'users', userId) : null),
    [firestore, userId]
  );

  const { data: userData, isLoading: isUserDocLoading } = useDoc<EndUser>(userDocRef);

  useEffect(() => {
    if (userData) {
      setFormData(userData);
    }
  }, [userData]);

  const handleInputChange = (field: keyof EndUser, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      address: { ...prev.address, [field]: value },
    }));
  };

  const handleEmergencyContactChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      emergencyContact: { ...prev.emergencyContact, [field]: value },
    }));
  };

  const handleSaveChanges = async () => {
    if (!userDocRef) return;
    try {
      const { id, email, ...updateData } = formData; // Exclude id and email from update
      await updateDocumentNonBlocking(userDocRef, updateData);
      toast({
        title: 'Success',
        description: 'User profile has been updated.',
      });
    } catch (error) {
      console.error('Failed to save changes:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not save changes.',
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!userDocRef) return;
    try {
      await deleteDocumentNonBlocking(userDocRef);
      toast({
        variant: 'destructive',
        title: 'User Deleted',
        description: `${formData.firstName} ${formData.lastName} has been removed.`,
      });
      router.push('/vendor-admin/users');
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not delete user.',
      });
    }
  };
  
  const onTextScanned = (text: string, field: 'vin' | 'tag') => {
    const cleanedText = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (field === 'vin') {
      setFormData(prev => ({...prev, vinNumber: cleanedText}));
      setIsVinScannerOpen(false);
      toast({title: 'VIN Scanned', description: `VIN set to ${cleanedText}`})
    } else {
      setFormData(prev => ({...prev, tagNumber: cleanedText}));
      setIsTagScannerOpen(false);
      toast({title: 'Tag Scanned', description: `Tag set to ${cleanedText}`})
    }
  }
  
  const fullName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim();

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
              {isUserDocLoading ? <Skeleton className="h-8 w-48 inline-block" /> : `Edit Profile: ${fullName}`}
            </h1>
            <p className="text-muted-foreground">
              Manage profile, contact information, and truck details for this user.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Profile Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {isUserDocLoading ? (
              <>
                <div className="space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-10 w-full" /></div>
                <div className="space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-10 w-full" /></div>
                <div className="space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-10 w-full" /></div>
                <div className="space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-10 w-full" /></div>
              </>
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
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Address</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isUserDocLoading ? (
              <div className="space-y-4">
                <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-10 w-full" /></div>
                  <div className="space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-10 w-full" /></div>
                  <div className="space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-10 w-full" /></div>
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
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <HeartPulse className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Emergency Contact</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {isUserDocLoading ? (
              <>
                <div className="space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-10 w-full" /></div>
                <div className="space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-10 w-full" /></div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="emergency-name">Contact Name</Label>
                  <Input id="emergency-name" value={formData.emergencyContact?.name || ''} onChange={(e) => handleEmergencyContactChange('name', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency-phone">Contact Phone</Label>
                  <Input id="emergency-phone" type="tel" value={formData.emergencyContact?.phone || ''} onChange={(e) => handleEmergencyContactChange('phone', e.target.value)} />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Truck className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Truck Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
             {isUserDocLoading ? (
                 <>
                    <div className="space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-10 w-full" /></div>
                    <div className="space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-10 w-full" /></div>
                    <div className="space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-10 w-full" /></div>
                    <div className="space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-10 w-full" /></div>
                 </>
             ) : (
                <>
                    <div className="space-y-2">
                        <Label htmlFor="truck-company">Truck Company Name</Label>
                        <Input id="truck-company" value={formData.truckCompanyName || ''} onChange={(e) => handleInputChange('truckCompanyName', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="truck-unit">Truck Unit Number</Label>
                        <Input id="truck-unit" value={formData.truckUnitNumber || ''} onChange={(e) => handleInputChange('truckUnitNumber', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="vin-number">VIN Number</Label>
                        <div className="flex gap-2">
                          <Input id="vin-number" value={formData.vinNumber || ''} onChange={(e) => handleInputChange('vinNumber', e.target.value)} />
                          <Button variant="outline" size="icon" onClick={() => setIsVinScannerOpen(true)}><ScanLine className="h-4 w-4"/></Button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="tag-number">Tag Number</Label>
                         <div className="flex gap-2">
                          <Input id="tag-number" value={formData.tagNumber || ''} onChange={(e) => handleInputChange('tagNumber', e.target.value)} />
                          <Button variant="outline" size="icon" onClick={() => setIsTagScannerOpen(true)}><ScanLine className="h-4 w-4"/></Button>
                        </div>
                    </div>
                </>
            )}
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
              <CardTitle>Truck Images</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Truck Picture</Label>
                <div className="flex h-48 w-full items-center justify-center rounded-lg border-2 border-dashed">
                  <div className="text-center text-muted-foreground">
                    <Camera className="mx-auto h-8 w-8" />
                    <p className="mt-2 text-sm">No Image</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Picture
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Truck Tag / Unit Picture</Label>
                <div className="flex h-48 w-full items-center justify-center rounded-lg border-2 border-dashed">
                  <div className="text-center text-muted-foreground">
                    <Camera className="mx-auto h-8 w-8" />
                    <p className="mt-2 text-sm">No Image</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Tag Picture
                </Button>
              </div>
            </CardContent>
          </Card>

        <Card>
          <CardFooter className="flex justify-between border-t pt-6">
            <Button variant="destructive" onClick={() => setDeleteAlertOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete User
            </Button>
            <Button onClick={handleSaveChanges} disabled={isUserDocLoading}>
              Save All Changes
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
      
      <TextScanner
        open={isVinScannerOpen}
        onOpenChange={setIsVinScannerOpen}
        onTextScanned={(text) => onTextScanned(text, 'vin')}
        scanContext="VIN Number"
      />
      <TextScanner
        open={isTagScannerOpen}
        onOpenChange={setIsTagScannerOpen}
        onTextScanned={(text) => onTextScanned(text, 'tag')}
        scanContext="License Plate"
      />
    </>
  );
}
