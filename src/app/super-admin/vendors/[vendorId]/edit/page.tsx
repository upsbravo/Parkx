
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDoc, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';

type Vendor = {
  name: string;
  email: string;
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

export default function EditVendorPage() {
  const params = useParams();
  const router = useRouter();
  const vendorId = params.vendorId as string;
  const firestore = useFirestore();
  const { toast } = useToast();

  const [formData, setFormData] = useState<Partial<Vendor>>({});
  const [isSaving, setIsSaving] = useState(false);

  const vendorRef = useMemoFirebase(
    () => (vendorId ? doc(firestore, 'vendors', vendorId) : null),
    [vendorId, firestore]
  );
  const { data: vendorData, isLoading: isVendorLoading } = useDoc<Vendor>(vendorRef);

  useEffect(() => {
    if (vendorData) {
      setFormData(vendorData);
    }
  }, [vendorData]);

  const handleInputChange = (field: keyof Vendor, value: string) => {
    setFormData(prev => ({...prev, [field]: value}));
  };

  const handleAddressChange = (field: keyof NonNullable<Vendor['address']>, value: string) => {
      setFormData(prev => ({...prev, address: {...prev.address, [field]: value}}));
  }

  const handleSaveChanges = async () => {
    if (!vendorRef) return;
    setIsSaving(true);
    
    // We don't update the email as it's the login identifier and requires re-authentication.
    const { email, ...updateData } = formData;

    try {
      await updateDocumentNonBlocking(vendorRef, updateData);
      toast({
        title: 'Vendor Updated',
        description: `${formData.name}'s profile has been successfully saved.`,
      });
      router.push('/super-admin/vendors');
    } catch (error: any) {
      console.error('Failed to save vendor profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not save vendor profile. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isPageLoading = isVendorLoading;
  const isActionDisabled = isSaving || isPageLoading;

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
                <Link href="/super-admin/vendors">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
            </Button>
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    Edit Vendor: {isPageLoading ? <Skeleton className="h-8 w-48 inline-block" /> : formData.name}
                </h1>
                <p className="text-muted-foreground">
                    Update the profile and contact information for this vendor.
                </p>
            </div>
        </div>

      <Card>
        <CardHeader>
          <CardTitle>Company Info</CardTitle>
          <CardDescription>
              Changes made here will be reflected in the vendor's own dashboard and invoices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isPageLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <div className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="company-name">Name *</Label>
                    <Input id="company-name" value={formData.name || ''} onChange={e => handleInputChange('name', e.target.value)} disabled={isActionDisabled}/>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="email">Login Email *</Label>
                    <Input id="email" value={formData.email || ''} readOnly disabled title="The vendor's login email cannot be changed from this screen."/>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label htmlFor="website">Website</Label>
                        <Input id="website" value={formData.website || ''} onChange={e => handleInputChange('website', e.target.value)} disabled={isActionDisabled}/>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input id="phone" value={formData.phone || ''} onChange={e => handleInputChange('phone', e.target.value)} disabled={isActionDisabled}/>
                    </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Select value={formData.address?.country || 'United States of America'} onValueChange={value => handleAddressChange('country', value)} disabled={isActionDisabled}>
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
                        <Select value={formData.timeZone || 'America/New_York'} onValueChange={value => handleInputChange('timeZone', value)} disabled={isActionDisabled}>
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
                        <Input id="address1" value={formData.address?.street1 || ''} onChange={e => handleAddressChange('street1', e.target.value)} disabled={isActionDisabled}/>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="address2">Address 2</Label>
                        <Input id="address2" value={formData.address?.street2 || ''} onChange={e => handleAddressChange('street2', e.target.value)} disabled={isActionDisabled}/>
                    </div>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input id="city" value={formData.address?.city || ''} onChange={e => handleAddressChange('city', e.target.value)} disabled={isActionDisabled}/>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <Input id="state" value={formData.address?.state || ''} onChange={e => handleAddressChange('state', e.target.value)} disabled={isActionDisabled}/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="zip">ZIP Code</Label>
                        <Input id="zip" value={formData.address?.zip || ''} onChange={e => handleAddressChange('zip', e.target.value)} disabled={isActionDisabled}/>
                    </div>
                </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveChanges} disabled={isActionDisabled}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
