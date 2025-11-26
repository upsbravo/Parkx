'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useDoc, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Truck } from 'lucide-react';

type UserProfileData = {
    address: { street: string; city: string; state: string; zip: string; };
    vehicleYear: string;
    vehicleMake: string;
    vehicleModel: string;
    licensePlate: string;
    trailerPlate: string;
};

export default function CompleteProfilePage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<UserProfileData>({
    address: { street: '', city: '', state: '', zip: '' },
    vehicleYear: '',
    vehicleMake: '',
    vehicleModel: '',
    licensePlate: '',
    trailerPlate: '',
  });

  const userDocRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userData, isLoading: isUserDocLoading } = useDoc(userDocRef);

  const handleInputChange = <K extends keyof UserProfileData>(field: K, value: UserProfileData[K]) => {
      setFormData(prev => ({...prev, [field]: value}));
  };

  const handleAddressChange = (field: keyof UserProfileData['address'], value: string) => {
    setFormData(prev => ({
        ...prev,
        address: { ...prev.address, [field]: value }
    }));
  };

  const handleSubmit = async () => {
    if (!userDocRef) return;

    // Simple validation
    if (!formData.address.street || !formData.address.city || !formData.vehicleMake || !formData.licensePlate) {
        toast({
            variant: 'destructive',
            title: 'Missing Information',
            description: 'Please fill out all required fields.',
        });
        return;
    }

    setIsSubmitting(true);
    try {
        await updateDocumentNonBlocking(userDocRef, {
            ...formData,
            profileComplete: true,
        });
        toast({
            title: 'Profile Updated',
            description: "Thank you! You'll now be directed to sign the agreement.",
        });
        router.push('/end-user/waiver');
    } catch (error) {
        console.error("Failed to update profile:", error);
        toast({
            variant: 'destructive',
            title: 'Update Failed',
            description: 'Could not save your information. Please try again.',
        });
        setIsSubmitting(false);
    }
  };

  const isLoading = isUserLoading || isUserDocLoading;

  return (
    <div className="flex flex-col items-center justify-center p-4 md:p-6">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>
            Before you can sign the agreement and park, we need a few more details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
            {isLoading ? (
                <div className="space-y-6">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            ) : (
                <>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <MapPin className="h-5 w-5 text-muted-foreground" />
                            <h3 className="text-lg font-semibold">Your Address</h3>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="street">Street Address</Label>
                            <Input id="street" value={formData.address.street} onChange={e => handleAddressChange('street', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <Label htmlFor="city">City</Label>
                                <Input id="city" value={formData.address.city} onChange={e => handleAddressChange('city', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="state">State</Label>
                                <Input id="state" value={formData.address.state} onChange={e => handleAddressChange('state', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="zip">ZIP Code</Label>
                                <Input id="zip" value={formData.address.zip} onChange={e => handleAddressChange('zip', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Truck className="h-5 w-5 text-muted-foreground" />
                            <h3 className="text-lg font-semibold">Vehicle Information</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                             <div className="space-y-2">
                                <Label htmlFor="year">Year</Label>
                                <Input id="year" placeholder='2020' value={formData.vehicleYear} onChange={e => handleInputChange('vehicleYear', e.target.value)} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="make">Make</Label>
                                <Input id="make" placeholder='Freightliner' value={formData.vehicleMake} onChange={e => handleInputChange('vehicleMake', e.target.value)} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="model">Model</Label>
                                <Input id="model" placeholder='Cascadia' value={formData.vehicleModel} onChange={e => handleInputChange('vehicleModel', e.target.value)} />
                            </div>
                        </div>
                         <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                             <div className="space-y-2">
                                <Label htmlFor="license-plate">License Plate #</Label>
                                <Input id="license-plate" value={formData.licensePlate} onChange={e => handleInputChange('licensePlate', e.target.value)} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="trailer-plate">Trailer Plate # (if any)</Label>
                                <Input id="trailer-plate" value={formData.trailerPlate} onChange={e => handleInputChange('trailerPlate', e.target.value)} />
                            </div>
                        </div>
                    </div>
                </>
            )}

        </CardContent>
        <CardFooter>
          <Button onClick={handleSubmit} disabled={isLoading || isSubmitting} className="w-full">
            {isSubmitting ? 'Saving...' : 'Save and Continue to Agreement'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

    