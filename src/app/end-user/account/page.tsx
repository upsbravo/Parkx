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
import { User, MapPin, HeartPulse, Truck, Camera, Upload, Lock, ScanLine } from 'lucide-react';
import { useUser, useFirestore, useMemoFirebase, useDoc, useStorage } from '@/firebase';
import { useState, useEffect, useRef } from 'react';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider, updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { TextScanner } from '@/components/text-scanner';
import Image from 'next/image';
import { Progress } from '@/components/ui/progress';

type EndUser = {
  id: string;
  vendorId: string;
  firstName: string;
  lastName:string;
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
  truckImageUrl?: string;
  tagImageUrl?: string;
};

export default function AccountSettingsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  
  const [isVinScannerOpen, setIsVinScannerOpen] = useState(false);
  const [isTagScannerOpen, setIsTagScannerOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Image handling states
  const truckImageInputRef = useRef<HTMLInputElement>(null);
  const tagImageInputRef = useRef<HTMLInputElement>(null);
  const [truckImageFile, setTruckImageFile] = useState<File | null>(null);
  const [tagImageFile, setTagImageFile] = useState<File | null>(null);
  const [truckImagePreview, setTruckImagePreview] = useState<string | null>(null);
  const [tagImagePreview, setTagImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{truck?: number; tag?: number}>({});
  
  // Form states initialized to empty strings to be controlled
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [truckCompanyName, setTruckCompanyName] = useState('');
  const [truckUnitNumber, setTruckUnitNumber] = useState('');
  const [vinNumber, setVinNumber] = useState('');
  const [tagNumber, setTagNumber] = useState('');
  
  // Password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<EndUser>(userDocRef);

  useEffect(() => {
    if (userProfile) {
        setFullName(`${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim());
        setEmail(userProfile.email || '');
        setPhone(userProfile.phone || '');
        setStreet(userProfile.address?.street || '');
        setCity(userProfile.address?.city || '');
        setState(userProfile.address?.state || '');
        setZip(userProfile.address?.zip || '');
        setEmergencyName(userProfile.emergencyContact?.name || '');
        setEmergencyPhone(userProfile.emergencyContact?.phone || '');
        setTruckCompanyName(userProfile.truckCompanyName || '');
        setTruckUnitNumber(userProfile.truckUnitNumber || '');
        setVinNumber(userProfile.vinNumber || '');
        setTagNumber(userProfile.tagNumber || '');
        setTruckImagePreview(userProfile.truckImageUrl || null);
        setTagImagePreview(userProfile.tagImageUrl || null);
    } else if (user) {
        setFullName(user.displayName || '');
        setEmail(user.email || '');
    }
  }, [userProfile, user]);

   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'truck' | 'tag') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'truck') {
        setTruckImageFile(file);
        setTruckImagePreview(URL.createObjectURL(file));
      } else {
        setTagImageFile(file);
        setTagImagePreview(URL.createObjectURL(file));
      }
      setIsDirty(true);
    }
  };
  
  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    setIsDirty(true);
  };

  const uploadImage = (file: File, path: string, onProgress: (progress: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
        const imageRef = storageRef(storage, path);
        const uploadTask = uploadBytesResumable(imageRef, file);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                onProgress(progress);
            },
            (error) => {
                console.error("Upload failed:", error);
                reject(error);
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(downloadURL);
            }
        );
    });
  };

  const handleSaveChanges = async () => {
    if (!user || !userDocRef) {
        toast({ variant: 'destructive', title: 'Error', description: 'User data not found.' });
        return;
    }
    
    try {
        const [firstName, ...lastName] = fullName.split(' ');
        const updatedData: Partial<Omit<EndUser, 'id' | 'vendorId' | 'email'>> = {
            firstName,
            lastName: lastName.join(' '),
            phone,
            address: { street, city, state, zip },
            emergencyContact: { name: emergencyName, phone: emergencyPhone },
            truckCompanyName,
            truckUnitNumber,
            vinNumber,
            tagNumber,
        };

        if (truckImageFile) {
            updatedData.truckImageUrl = await uploadImage(
                truckImageFile, 
                `users/${user.uid}/images/truck.jpg`,
                (p) => setUploadProgress(prev => ({...prev, truck: p}))
            );
        }
        if (tagImageFile) {
            updatedData.tagImageUrl = await uploadImage(
                tagImageFile, 
                `users/${user.uid}/images/tag.jpg`,
                (p) => setUploadProgress(prev => ({...prev, tag: p}))
            );
        }

        await updateDoc(userDocRef, updatedData);

        if(user.displayName !== fullName) {
            await updateProfile(user, { displayName: fullName });
        }

        toast({ title: 'Success', description: 'Your changes have been saved.' });
        setUploadProgress({});
        setTruckImageFile(null);
        setTagImageFile(null);
        setIsDirty(false);

    } catch (error: any) {
        console.error('Failed to save changes:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save your changes. Please try again.' });
    }
  };

  const handlePasswordUpdate = async () => {
    if (!user || !user.email) return;
    if (newPassword !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Error', description: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ variant: 'destructive', title: 'Error', description: 'Password must be at least 6 characters.' });
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      toast({
        title: 'Password Updated',
        description: 'Your password has been changed successfully. You will be logged out.',
      });
      // It's a good practice to sign the user out after a password change
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast({
        variant: 'destructive',
        title: 'Password Update Failed',
        description: error.message || 'Could not update password. Please check your current password.',
      });
    }
  };
  
  const onTextScanned = (text: string, field: 'vin' | 'tag') => {
    const cleanedText = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (field === 'vin') {
      setVinNumber(cleanedText);
      setIsVinScannerOpen(false);
      toast({title: 'VIN Scanned', description: `VIN set to ${cleanedText}`})
    } else {
      setTagNumber(cleanedText);
      setIsTagScannerOpen(false);
      toast({title: 'Tag Scanned', description: `Tag set to ${cleanedText}`})
    }
    setIsDirty(true);
  }

  const isLoading = isUserLoading || isProfileLoading;

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
          <p className="text-muted-foreground">
            Manage your profile, contact information, and truck details.
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Profile Information</CardTitle>
              </div>
              <CardDescription>
                This is your public display name and contact email.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {isLoading ? (
                  <>
                      <div className="space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-10 w-full" /></div>
                      <div className="space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-10 w-full" /></div>
                      <div className="space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-10 w-full" /></div>
                  </>
              ) : (
                  <>
                      <div className="space-y-2">
                          <Label htmlFor="full-name">Full Name</Label>
                          <Input id="full-name" value={fullName} onChange={handleInputChange(setFullName)} />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <Input id="email" type="email" value={email} readOnly disabled />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input id="phone" type="tel" value={phone} onChange={handleInputChange(setPhone)} />
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
              <CardDescription>Your primary residence address.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
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
                          <Input id="street-address" value={street} onChange={handleInputChange(setStreet)} />
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                              <Label htmlFor="city">City</Label>
                              <Input id="city" value={city} onChange={handleInputChange(setCity)} />
                          </div>
                          <div className="space-y-2">
                              <Label htmlFor="state">State / Province</Label>
                              <Input id="state" value={state} onChange={handleInputChange(setState)} />
                          </div>
                          <div className="space-y-2">
                              <Label htmlFor="zip">Zip / Postal Code</Label>
                              <Input id="zip" value={zip} onChange={handleInputChange(setZip)} />
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
              <CardDescription>
                Who we should contact in case of an emergency.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {isLoading ? (
                  <>
                      <div className="space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-10 w-full" /></div>
                      <div className="space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-10 w-full" /></div>
                  </>
              ) : (
                  <>
                      <div className="space-y-2">
                          <Label htmlFor="emergency-name">Contact Name</Label>
                          <Input id="emergency-name" value={emergencyName} onChange={handleInputChange(setEmergencyName)} />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="emergency-phone">Contact Phone</Label>
                          <Input id="emergency-phone" type="tel" value={emergencyPhone} onChange={handleInputChange(setEmergencyPhone)} />
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
              <CardDescription>
                Details about the truck you will be parking.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                  <Label htmlFor="truck-company">Truck Company Name</Label>
                  <Input id="truck-company" value={truckCompanyName} onChange={handleInputChange(setTruckCompanyName)} />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="truck-unit">Truck Unit Number</Label>
                  <Input id="truck-unit" value={truckUnitNumber} onChange={handleInputChange(setTruckUnitNumber)} />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="vin-number">VIN Number</Label>
                  <div className="flex gap-2">
                    <Input id="vin-number" value={vinNumber} onChange={handleInputChange(setVinNumber)} />
                    <Button variant="outline" size="icon" onClick={() => setIsVinScannerOpen(true)}><ScanLine className="h-4 w-4"/></Button>
                  </div>
              </div>
              <div className="space-y-2">
                  <Label htmlFor="tag-number">Tag Number</Label>
                   <div className="flex gap-2">
                    <Input id="tag-number" value={tagNumber} onChange={handleInputChange(setTagNumber)} />
                    <Button variant="outline" size="icon" onClick={() => setIsTagScannerOpen(true)}><ScanLine className="h-4 w-4"/></Button>
                  </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Truck Images</CardTitle>
              <CardDescription>
                Pictures of the truck you will be parking and its tag/unit number.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Truck Picture</Label>
                 <div className="flex h-48 w-full items-center justify-center rounded-lg border-2 border-dashed relative overflow-hidden">
                  {truckImagePreview ? (
                    <Image src={truckImagePreview} alt="Truck Preview" fill className="object-cover" />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <Camera className="mx-auto h-8 w-8" />
                      <p className="mt-2 text-sm">No Image</p>
                    </div>
                  )}
                </div>
                {uploadProgress.truck && uploadProgress.truck < 100 ? (
                    <Progress value={uploadProgress.truck} />
                ) : (
                    <Button variant="outline" className="w-full" onClick={() => truckImageInputRef.current?.click()}>
                        <Upload className="mr-2 h-4 w-4" />
                        {truckImageFile ? 'Change Picture' : 'Upload Picture'}
                    </Button>
                )}
                <Input type="file" ref={truckImageInputRef} onChange={(e) => handleFileChange(e, 'truck')} className="hidden" accept="image/*" />
              </div>
              <div className="space-y-2">
                <Label>Truck Tag / Unit Picture</Label>
                <div className="flex h-48 w-full items-center justify-center rounded-lg border-2 border-dashed relative overflow-hidden">
                  {tagImagePreview ? (
                    <Image src={tagImagePreview} alt="Tag Preview" fill className="object-cover" />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <Camera className="mx-auto h-8 w-8" />
                      <p className="mt-2 text-sm">No Image</p>
                    </div>
                  )}
                </div>
                 {uploadProgress.tag && uploadProgress.tag < 100 ? (
                    <Progress value={uploadProgress.tag} />
                ) : (
                    <Button variant="outline" className="w-full" onClick={() => tagImageInputRef.current?.click()}>
                        <Upload className="mr-2 h-4 w-4" />
                        {tagImageFile ? 'Change Picture' : 'Upload Tag Picture'}
                    </Button>
                 )}
                <Input type="file" ref={tagImageInputRef} onChange={(e) => handleFileChange(e, 'tag')} className="hidden" accept="image/*" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Change Password</CardTitle>
              </div>
              <CardDescription>
                Update your account password. You will be logged out after a
                successful change.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input 
                  id="new-password" 
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handlePasswordUpdate}>Update Password</Button>
            </CardFooter>
          </Card>

          <div className="flex justify-end">
            <Button size="lg" onClick={handleSaveChanges} disabled={!isDirty}>Save All Changes</Button>
          </div>
        </div>
      </div>
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

    