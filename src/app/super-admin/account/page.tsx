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
import { User, Lock, UserPlus } from 'lucide-react';
import { useAuth, useUser, useFirestore, type Auth } from '@/firebase';
import { useState, useEffect } from 'react';
import { updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function SuperAdminAccountPage() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [newAdminFullName, setNewAdminFullName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);


  useEffect(() => {
    if (user) {
      setFullName(user.displayName || 'Super Admin');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleProfileSave = async () => {
    if (!user) return;
  
    try {
      // Update email in Firebase Auth if it changed
      if (email !== user.email && user.email) {
        const currentPassword = prompt("Please enter your current password to confirm email change:");
        if (!currentPassword) {
          toast({ variant: 'destructive', title: 'Authentication Required', description: 'Password is required to change email.' });
          return;
        }
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updateEmail(user, email);
      }
      
      // Update displayName in Firebase Auth if it changed
      if (fullName !== user.displayName) {
        await updateProfile(user, { displayName: fullName });
      }
  
      // Update profile in Firestore
      const userRef = doc(firestore, 'super_admins', user.uid);
      await updateDoc(userRef, {
        firstName: fullName.split(' ')[0],
        lastName: fullName.split(' ').slice(1).join(' '),
        email: email,
      });
  
      toast({
        title: 'Profile Updated',
        description: 'Your profile information has been saved.',
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message || 'Could not update profile. You may need to log out and log back in.',
      });
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
            description: 'Your password has been changed successfully. Please log in again.',
        });
        // You might want to sign the user out here
    } catch (error: any) {
        console.error('Error updating password:', error);
        toast({
            variant: 'destructive',
            title: 'Password Update Failed',
            description: error.message || 'Could not update password. Please check your current password.',
        });
    }
  };
  
  const handleCreateAdmin = async () => {
      if (!newAdminEmail || !newAdminPassword || !newAdminFullName) {
          toast({ variant: "destructive", title: "Error", description: "Please fill out all fields for the new admin." });
          return;
      }
      setIsCreatingAdmin(true);

      try {
          // Use the auth instance from the hook to avoid conflicts
          const userCredential = await createUserWithEmailAndPassword(auth, newAdminEmail, newAdminPassword);
          const newAdminUser = userCredential.user;
          
          await updateProfile(newAdminUser, { displayName: newAdminFullName });

          // Create the document in the super_admins collection
          const adminRef = doc(firestore, "super_admins", newAdminUser.uid);
          await setDoc(adminRef, {
              id: newAdminUser.uid,
              email: newAdminEmail,
              firstName: newAdminFullName.split(' ')[0],
              lastName: newAdminFullName.split(' ').slice(1).join(' '),
          });
          
          // CRITICAL: Create the role document for security rules to work
          const roleRef = doc(firestore, "roles_super_admin", newAdminUser.uid);
          await setDoc(roleRef, {
              active: true,
          });
          
          toast({
              title: "Super Admin Created",
              description: `${newAdminFullName} can now log in with the provided credentials.`,
          });
          
          // Clear fields
          setNewAdminFullName('');
          setNewAdminEmail('');
          setNewAdminPassword('');

      } catch (error: any) {
          console.error("Error creating super admin:", error);
          toast({
              variant: "destructive",
              title: "Creation Failed",
              description: error.message || "There was a problem creating the new super admin.",
          });
      } finally {
          setIsCreatingAdmin(false);
      }
  };


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Super Admin Account
        </h1>
        <p className="text-muted-foreground">
          Manage your account settings and password.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Profile Information</CardTitle>
          </div>
          <CardDescription>
            This is your display name and contact email.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {isUserLoading ? (
              <>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="full-name">Full Name</Label>
                  <Input
                    id="full-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleProfileSave}>Save Changes</Button>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <UserPlus className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Create New Super Admin</CardTitle>
          </div>
          <CardDescription>
            Create an additional Super Admin account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="space-y-2">
              <Label htmlFor="new-admin-full-name">Full Name</Label>
              <Input
                id="new-admin-full-name"
                value={newAdminFullName}
                onChange={(e) => setNewAdminFullName(e.target.value)}
                placeholder="Jane Doe"
                disabled={isCreatingAdmin}
              />
            </div>
          <div className="space-y-2">
            <Label htmlFor="new-admin-email">Email Address</Label>
            <Input
              id="new-admin-email"
              type="email"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              placeholder="new.admin@parkx.com"
              disabled={isCreatingAdmin}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-admin-password">Temporary Password</Label>
            <Input
              id="new-admin-password"
              type="password"
              value={newAdminPassword}
              onChange={(e) => setNewAdminPassword(e.target.value)}
              placeholder="Set a strong temporary password"
              disabled={isCreatingAdmin}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleCreateAdmin} disabled={isCreatingAdmin}>
            {isCreatingAdmin ? 'Creating...' : 'Create Admin'}
          </Button>
        </CardFooter>
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
              placeholder='Enter your current password'
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder='Enter your new password'
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder='Confirm your new password'
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handlePasswordUpdate}>Update Password</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
