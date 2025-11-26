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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  User,
  MapPin,
  HeartPulse,
  Car,
  FileText,
  Camera,
  Upload,
  Lock,
} from 'lucide-react';
import { useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { useState, useEffect } from 'react';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider, updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

type EndUser = {
  id: string;
  vendorId: string;
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
};

export default function AccountSettingsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [userData, setUserData] = useState<EndUser | null>(null);
  
  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  
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
        setUserData(userProfile);
        setFullName(`${userProfile.firstName} ${userProfile.lastName}`);
        setEmail(userProfile.email);
        setPhone(userProfile.phone || '');
        setStreet(userProfile.address?.street || '');
        setCity(userProfile.address?.city || '');
        setState(userProfile.address?.state || '');
        setZip(userProfile.address?.zip || '');
        setEmergencyName(userProfile.emergencyContact?.name || '');
        setEmergencyPhone(userProfile.emergencyContact?.phone || '');
    } else if (user) {
        // Fallback for when profile is loading
        setFullName(user.displayName || '');
        setEmail(user.email || '');
    }
  }, [userProfile, user]);

  const handleSaveChanges = async () => {
    if (!user || !userDocRef) {
        toast({ variant: 'destructive', title: 'Error', description: 'User data not found.' });
        return;
    }
    
    try {
        const [firstName, ...lastName] = fullName.split(' ');
        const updatedData = {
            firstName,
            lastName: lastName.join(' '),
            phone,
            address: { street, city, state, zip },
            emergencyContact: { name: emergencyName, phone: emergencyPhone }
        };

        await updateDoc(userDocRef, updatedData);

        if(user.displayName !== fullName) {
            await updateProfile(user, { displayName: fullName });
        }

        toast({ title: 'Success', description: 'Your changes have been saved.' });

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

  const isLoading = isUserLoading || isProfileLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile, contact information, and vehicle details.
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
                        <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" type="email" value={email} readOnly disabled />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
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
                        <Input id="street-address" value={street} onChange={(e) => setStreet(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="city">City</Label>
                            <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="state">State / Province</Label>
                            <Input id="state" value={state} onChange={(e) => setState(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="zip">Zip / Postal Code</Label>
                            <Input id="zip" value={zip} onChange={(e) => setZip(e.target.value)} />
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
                        <Input id="emergency-name" value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="emergency-phone">Contact Phone</Label>
                        <Input id="emergency-phone" type="tel" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} />
                    </div>
                </>
             )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Car className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Vehicle Information</CardTitle>
            </div>
            <CardDescription>
              Pictures of the car you will be parking and its license plate.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Car Picture</Label>
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
              <Label>Car Tag Picture</Label>
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
          <CardHeader>
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <CardTitle>My Documents</CardTitle>
            </div>
            <CardDescription>
              Documents related to your parking agreement uploaded by your
              administrator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document Name</TableHead>
                  <TableHead>Upload Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    No documents found.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
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
          <Button size="lg" onClick={handleSaveChanges}>Save All Changes</Button>
        </div>
      </div>
    </div>
  );
}
