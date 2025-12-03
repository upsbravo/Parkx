
'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
  useCollection,
  useUser
} from '@/firebase';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
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
  FileText,
  Download,
  Mail,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

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
  vendorId: string;
};

type UserDocument = {
    id: string;
    name: string;
    createdAt: string; // ISO string
    content: string;
};

type SmsLog = {
    id: string;
    to: string;
    body: string;
    status: 'success' | 'failed';
    error?: string;
    sentAt: any;
};


export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = params.userId as string;

  const firestore = useFirestore();
  const { user: vendorAdmin } = useUser();
  const { toast } = useToast();

  const [formData, setFormData] = useState<Partial<EndUser>>({});
  const [isDeleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [isVinScannerOpen, setIsVinScannerOpen] = useState(false);
  const [isTagScannerOpen, setIsTagScannerOpen] = useState(false);
  
  const defaultTab = searchParams.get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState(defaultTab);


  const userDocRef = useMemoFirebase(
    () => (firestore && userId ? doc(firestore, 'users', userId) : null),
    [firestore, userId]
  );

  const { data: userData, isLoading: isUserDocLoading } = useDoc<EndUser>(userDocRef);

  const documentsQuery = useMemoFirebase(() => {
      if (!firestore || !vendorAdmin || !userId) return null;
      return query(
          collection(firestore, 'vendors', vendorAdmin.uid, 'userDocuments'),
          where('userId', '==', userId)
      );
  }, [firestore, vendorAdmin, userId]);
  
  const smsLogsQuery = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return query(
      collection(firestore, 'users', userId, 'sms_logs'),
      orderBy('sentAt', 'desc')
    );
  }, [firestore, userId]);


  const { data: userDocuments, isLoading: areDocumentsLoading } = useCollection<UserDocument>(documentsQuery);
  const { data: smsLogs, isLoading: areSmsLogsLoading } = useCollection<SmsLog>(smsLogsQuery);

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

  const handleDownloadDocument = (doc: UserDocument) => {
    const blob = new Blob([doc.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.name.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const fullName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim();
  const isLoading = isUserDocLoading || areDocumentsLoading || areSmsLogsLoading;

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
              {isLoading ? <Skeleton className="h-8 w-48 inline-block" /> : `Edit Profile: ${fullName}`}
            </h1>
            <p className="text-muted-foreground">
              Manage profile, contact information, and truck details for this user.
            </p>
          </div>
        </div>

        <Tabs defaultValue={defaultTab} onValueChange={setActiveTab} value={activeTab}>
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profile">Profile & Vehicle</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="sms">SMS History</TabsTrigger>
            </TabsList>
            <TabsContent value="profile" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <CardTitle>Profile Information</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    {isLoading ? (
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
                    {isLoading ? (
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
                     {isLoading ? (
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
                    <Button onClick={handleSaveChanges} disabled={isLoading}>
                      Save All Changes
                    </Button>
                  </CardFooter>
                </Card>
            </TabsContent>
            <TabsContent value="documents">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <CardTitle>User Documents</CardTitle>
                        </div>
                        <CardDescription>
                            Official documents related to this user, such as their signed agreement or spot change records.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead>Document Name</TableHead>
                                <TableHead>Date Created</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 2 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={3}><Skeleton className="h-10 w-full" /></TableCell>
                                    </TableRow>
                                    ))
                                ) : userDocuments && userDocuments.length > 0 ? (
                                    userDocuments.map((doc) => (
                                        <TableRow key={doc.id}>
                                            <TableCell className="font-medium">{doc.name}</TableCell>
                                            <TableCell>{new Date(doc.createdAt).toLocaleDateString()}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleDownloadDocument(doc)}>
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">
                                        No documents found for this user.
                                    </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
             <TabsContent value="sms">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <Mail className="h-5 w-5 text-muted-foreground" />
                            <CardTitle>SMS History</CardTitle>
                        </div>
                        <CardDescription>
                            A log of all text messages sent to this user from the platform.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead>Date Sent</TableHead>
                                <TableHead>Message</TableHead>
                                <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={3}><Skeleton className="h-10 w-full" /></TableCell>
                                    </TableRow>
                                    ))
                                ) : smsLogs && smsLogs.length > 0 ? (
                                    smsLogs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="text-xs">{log.sentAt ? format(log.sentAt.toDate(), 'PPpp') : '...'}</TableCell>
                                            <TableCell className="max-w-md truncate">{log.body}</TableCell>
                                            <TableCell>
                                                <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>{log.status}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">
                                        No SMS messages have been sent to this user.
                                    </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
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
