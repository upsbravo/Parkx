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

type Vendor = {
  name: string;
  logoUrl?: string;
};

export default function BrandingPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const vendorRef = useMemoFirebase(
    () => (user ? doc(firestore, 'vendors', user.uid) : null),
    [user, firestore]
  );
  const { data: vendorData, isLoading: isVendorDataLoading } = useDoc<Vendor>(vendorRef);

  useEffect(() => {
    if (vendorData) {
      setCompanyName(vendorData.name || '');
      setLogoUrl(vendorData.logoUrl || null);
    }
  }, [vendorData]);

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveChanges = async () => {
    if (!user || !vendorData) return;
    setIsLoading(true);

    try {
      let updatedLogoUrl = vendorData.logoUrl;

      // 1. Upload new logo if one was selected
      if (logoFile) {
        const storage = getStorage();
        const logoStorageRef = storageRef(storage, `vendors/${user.uid}/logo/${logoFile.name}`);
        const snapshot = await uploadBytes(logoStorageRef, logoFile);
        updatedLogoUrl = await getDownloadURL(snapshot.ref);
      }
      
      // 2. Update Auth profile if name changed
      if (companyName !== user.displayName) {
          await updateProfile(user, { displayName: companyName });
      }

      // 3. Update Firestore document
      await updateDoc(vendorRef!, {
        name: companyName,
        logoUrl: updatedLogoUrl,
      });

      toast({
        title: 'Branding Updated',
        description: 'Your company name and logo have been saved.',
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
          Branding & Appearance
        </h1>
        <p className="text-muted-foreground">
          Customize the look and feel of your parking management system.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company Branding</CardTitle>
          <CardDescription>
            Update your company name and logo. This will be visible to your
            users.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isPageLoading ? (
            <>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <div className="flex items-center gap-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <Skeleton className="h-10 w-28" />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Company Logo</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    {logoUrl ? (
                      <AvatarImage src={logoUrl} alt={companyName} className="object-contain" />
                    ) : null}
                    <AvatarFallback className="text-2xl">
                        {companyName?.[0]?.toUpperCase() || 'A'}
                    </AvatarFallback>
                  </Avatar>
                  <Button variant="outline" onClick={handleLogoClick}>
                    Upload Logo
                  </Button>
                  <Input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/png, image/jpeg, image/gif, image/webp"
                  />
                </div>
              </div>
            </>
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
