'use client';

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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { useState, useEffect, useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Vendor = {
  name: string;
  logoUrl?: string;
  website?: string;
  phone?: string;
  address?: {
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  timeZone?: string;
};

// Simplified type for form state
type VendorFormData = {
    name: string;
    website: string;
    phone: string;
    street1: string;
    street2: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    timeZone: string;
    logoUrl: string | null;
}

export default function BrandingPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<VendorFormData>({
    name: '',
    website: '',
    phone: '',
    street1: '',
    street2: '',
    city: '',
    state: '',
    zip: '',
    country: 'United States of America',
    timeZone: 'America/New_York',
    logoUrl: null,
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const vendorRef = useMemoFirebase(
    () => (user ? doc(firestore, 'vendors', user.uid) : null),
    [user, firestore]
  );
  const { data: vendorData, isLoading: isVendorDataLoading } = useDoc<Vendor>(vendorRef);

  useEffect(() => {
    if (vendorData) {
      setFormData({
        name: vendorData.name || '',
        logoUrl: vendorData.logoUrl || null,
        website: vendorData.website || '',
        phone: vendorData.phone || '',
        street1: vendorData.address?.street1 || '',
        street2: vendorData.address?.street2 || '',
        city: vendorData.address?.city || '',
        state: vendorData.address?.state || '',
        zip: vendorData.address?.zip || '',
        country: vendorData.address?.country || 'United States of America',
        timeZone: vendorData.timeZone || 'America/New_York',
      });
    }
  }, [vendorData]);

  const handleInputChange = (field: keyof VendorFormData, value: string) => {
    setFormData(prev => ({...prev, [field]: value}));
  };

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveChanges = async () => {
    if (!user || !vendorData) return;
    setIsLoading(true);

    try {
      let updatedLogoUrl = vendorData.logoUrl;

      if (logoFile) {
        const storage = getStorage();
        const logoStorageRef = storageRef(storage, `vendors/${user.uid}/logo/${logoFile.name}`);
        const snapshot = await uploadBytes(logoStorageRef, logoFile);
        updatedLogoUrl = await getDownloadURL(snapshot.ref);
      }
      
      if (formData.name !== user.displayName) {
          await updateProfile(user, { displayName: formData.name });
      }

      await updateDoc(vendorRef!, {
        name: formData.name,
        logoUrl: updatedLogoUrl,
        website: formData.website,
        phone: formData.phone,
        timeZone: formData.timeZone,
        address: {
            street1: formData.street1,
            street2: formData.street2,
            city: formData.city,
            state: formData.state,
            zip: formData.zip,
            country: formData.country,
        }
      });

      toast({
        title: 'Branding Updated',
        description: 'Your company profile has been saved.',
      });
    } catch (error: any) {
      console.error('Failed to save branding:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not save your changes. Please try again.',
      });
    } finally {
      setIsLoading(false);
      setLogoFile(null);
    }
  };

  const isPageLoading = isUserLoading || isVendorDataLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Profile
        </h1>
        <p className="text-muted-foreground">
          This information will appear on your invoices and customer-facing views.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company Info</CardTitle>
        </CardHeader>
        <CardContent>
          {isPageLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="company-name">Name *</Label>
                        <Input id="company-name" value={formData.name} onChange={e => handleInputChange('name', e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="website">Website</Label>
                        <Input id="website" value={formData.website} onChange={e => handleInputChange('website', e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input id="email" value={user?.email || ''} readOnly disabled />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="phone">Phone *</Label>
                        <Input id="phone" value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)} />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="country">Country</Label>
                            <Select value={formData.country} onValueChange={value => handleInputChange('country', value)}>
                                <SelectTrigger id="country"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="United States of America">United States of America</SelectItem>
                                    <SelectItem value="Canada">Canada</SelectItem>
                                    <SelectItem value="Mexico">Mexico</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="timezone">Time Zone</Label>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label htmlFor="address1">Address 1</Label>
                            <Input id="address1" value={formData.street1} onChange={e => handleInputChange('street1', e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="address2">Address 2</Label>
                            <Input id="address2" value={formData.street2} onChange={e => handleInputChange('street2', e.target.value)} />
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div className="space-y-2">
                            <Label htmlFor="city">City</Label>
                            <Input id="city" value={formData.city} onChange={e => handleInputChange('city', e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="state">State</Label>
                            <Input id="state" value={formData.state} onChange={e => handleInputChange('state', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="zip">ZIP Code</Label>
                            <Input id="zip" value={formData.zip} onChange={e => handleInputChange('zip', e.target.value)} />
                        </div>
                    </div>
                </div>
                <div className="md:col-span-1 space-y-2">
                     <Label>Company Logo</Label>
                     <div 
                        className="aspect-square w-full rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer"
                        onClick={handleLogoClick}
                     >
                        {formData.logoUrl ? (
                            <Image src={formData.logoUrl} alt={formData.name} width={200} height={200} className="object-contain p-4" />
                        ) : (
                            <div className="text-center text-muted-foreground">
                                Click to upload logo
                            </div>
                        )}
                        <Input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept="image/png, image/jpeg, image/gif, image/webp"
                        />
                     </div>
                     <p className="text-xs text-muted-foreground text-center">Appears on PDFs and customer-facing views</p>
                </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveChanges} disabled={isLoading || isPageLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

    