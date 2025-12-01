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
import { Building, MapPin } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type VendorProfileData = {
  name: string;
  phone: string;
  website: string;
  address: { street1: string; street2: string; city: string; state: string; zip: string; country: string; };
  timeZone: string;
};

export default function CompleteVendorProfilePage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<VendorProfileData>({
    name: '',
    phone: '',
    website: '',
    address: { street1: '', street2: '', city: '', state: '', zip: '', country: 'United States of America' },
    timeZone: 'America/New_York',
  });

  const userDocRef = useMemoFirebase(() => (user ? doc(firestore, 'vendors', user.uid) : null), [user, firestore]);
  const { data: userData, isLoading: isUserDocLoading } = useDoc(userDocRef);
  
   useEffect(() => {
    if (userData) {
      setFormData(prev => ({
        ...prev,
        name: userData.name || '',
      }))
    }
  }, [userData])

  const handleInputChange = <K extends keyof VendorProfileData>(field: K, value: VendorProfileData[K]) => {
      setFormData(prev => ({...prev, [field]: value}));
  };

  const handleAddressChange = (field: keyof VendorProfileData['address'], value: string) => {
    setFormData(prev => ({
        ...prev,
        address: { ...prev.address, [field]: value }
    }));
  };

  const handleSubmit = async () => {
    if (!userDocRef) return;

    // Simple validation
    if (!formData.name || !formData.address.street1 || !formData.address.city || !formData.phone) {
        toast({
            variant: 'destructive',
            title: 'Missing Information',
            description: 'Please fill out all required fields marked with an asterisk (*).',
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
            description: "Thank you! You'll now be directed to sign the master agreement.",
        });
        router.push('/vendor-admin/master-agreement');
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
    <div className="flex flex-col items-center justify-center p-4 md:p-6 min-h-screen bg-muted">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="text-2xl">Complete Your Company Profile</CardTitle>
          <CardDescription>
            Before you can sign the agreement and start using ParkX, we need a few more details about your business.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
            {isLoading ? (
                <div className="space-y-6">
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-40 w-full" />
                </div>
            ) : (
                <>
                     <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Building className="h-5 w-5 text-muted-foreground" />
                            <h3 className="text-lg font-semibold">Company Details</h3>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="name">Company Name *</Label>
                            <Input id="name" value={formData.name} onChange={e => handleInputChange('name', e.target.value)} />
                        </div>
                         <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                             <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number *</Label>
                                <Input id="phone" value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="website">Website</Label>
                                <Input id="website" placeholder="https://your-company.com" value={formData.website} onChange={e => handleInputChange('website', e.target.value)} />
                            </div>
                        </div>
                    </div>


                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <MapPin className="h-5 w-5 text-muted-foreground" />
                            <h3 className="text-lg font-semibold">Company Address</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="street1">Street Address 1 *</Label>
                                <Input id="street1" value={formData.address.street1} onChange={e => handleAddressChange('street1', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="street2">Street Address 2</Label>
                                <Input id="street2" value={formData.address.street2} onChange={e => handleAddressChange('street2', e.target.value)} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <Label htmlFor="city">City *</Label>
                                <Input id="city" value={formData.address.city} onChange={e => handleAddressChange('city', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="state">State *</Label>
                                <Input id="state" value={formData.address.state} onChange={e => handleAddressChange('state', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="zip">ZIP Code *</Label>
                                <Input id="zip" value={formData.address.zip} onChange={e => handleAddressChange('zip', e.target.value)} />
                            </div>
                        </div>
                         <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                           <div className="space-y-2">
                                <Label htmlFor="country">Country *</Label>
                                <Select value={formData.address.country} onValueChange={value => handleAddressChange('country', value)}>
                                    <SelectTrigger id="country"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="United States of America">United States of America</SelectItem>
                                        <SelectItem value="Canada">Canada</SelectItem>
                                        <SelectItem value="Mexico">Mexico</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="timezone">Time Zone *</Label>
                                <Select value={formData.timeZone} onValueChange={value => handleInputChange('timeZone', value)}>
                                    <SelectTrigger id="timezone"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                                        <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                                        <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                                        <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </>
            )}

        </CardContent>
        <CardFooter>
          <Button onClick={handleSubmit} disabled={isLoading || isSubmitting} className="w-full" size="lg">
            {isSubmitting ? 'Saving...' : 'Save and Continue to Agreement'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
