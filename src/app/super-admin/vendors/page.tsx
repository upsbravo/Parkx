
"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Search, Star, FileText, Edit, Gift, Play, Pause, X, Zap, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InviteVendorDialog } from "./invite-dialog";
import { AdjustSpotLimitDialog } from "./adjust-spot-limit-dialog";
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, useAuth, deleteDocumentNonBlocking, useUser, addDocumentNonBlocking } from "@/firebase";
import { collection, doc, serverTimestamp, query, where, getDocs, writeBatch } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { sendPasswordResetEmail } from "firebase/auth";
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
import { differenceInDays } from "date-fns";
import Link from 'next/link';
import { cancelStripeSubscription } from "@/ai/flows/cancel-stripe-subscription-flow";
import { pauseStripeSubscription } from "@/ai/flows/pause-stripe-subscription-flow";
import { resumeStripeSubscription } from "@/ai/flows/resume-stripe-subscription-flow";
import { updateStripeSubscription } from "@/ai/flows/update-stripe-subscription-flow";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


type Vendor = {
  id: string;
  name: string;
  email: string;
  status: 'Pending' | 'Active' | 'Trial' | 'Inactive' | 'Pending Agreement' | 'Canceled' | 'Paused';
  joinDate: string; // ISO string
  trialEnds: string | null; // ISO string or null
  spotsUsed: number;
  spotLimit: number;
  isPrivileged?: boolean;
  stripeSubscriptionId?: string;
};


export default function VendorsPage() {
  const [isInviteOpen, setInviteOpen] = useState(false);
  const [isAdjustOpen, setAdjustOpen] = useState(false);
  const [isDeactivateAlertOpen, setDeactivateAlertOpen] = useState(false);
  const [isDeleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth();
  const { user: superAdmin, isUserLoading } = useUser();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    setIsClient(true);
  }, []);


  const firestore = useFirestore();
  const vendorsQuery = useMemoFirebase(() => {
    if (isUserLoading || !superAdmin || !firestore) return null;
    return collection(firestore, 'vendors');
  }, [firestore, superAdmin, isUserLoading]);
  const { data: vendors, isLoading } = useCollection<Vendor>(vendorsQuery);

  const filteredVendors = useMemo(() => {
    if (!vendors) return [];
    return vendors.filter(vendor => {
      const searchMatch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          vendor.email.toLowerCase().includes(searchTerm.toLowerCase());
      const statusMatch = statusFilter === 'All' || vendor.status === statusFilter;
      return searchMatch && statusMatch;
    });
  }, [vendors, searchTerm, statusFilter]);

  const statusVariant = {
    Active: "default",
    Pending: "secondary",
    Trial: "outline",
    Inactive: "destructive",
    'Pending Agreement': "secondary",
    Canceled: "destructive",
    Paused: "secondary"
  } as const;

  const createNotification = (title: string, message: string, type: 'payment_failure' | 'new_vendor' | 'support_ticket' = 'new_vendor') => {
    if (!superAdmin) return;
    const notifRef = collection(firestore, 'superAdmins', superAdmin.uid, 'notifications');
    addDocumentNonBlocking(notifRef, {
      title,
      message,
      type,
      isRead: false,
      createdAt: serverTimestamp(),
    })
  }

  const handleAdjustClick = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setAdjustOpen(true);
  };
  
  const handleTogglePrivileged = (vendor: Vendor) => {
    const vendorRef = doc(firestore, "vendors", vendor.id);
    const newStatus = !vendor.isPrivileged;
    updateDocumentNonBlocking(vendorRef, { isPrivileged: newStatus });
    toast({
      title: `Vendor ${newStatus ? 'Promoted' : 'Demoted'}`,
      description: `${vendor.name} is now a ${newStatus ? 'Privileged' : 'Regular'} Vendor.`,
    });
    createNotification(
        `Vendor ${newStatus ? 'Promoted' : 'Demoted'}`,
        `${vendor.name} is now a ${newStatus ? 'Privileged' : 'Regular'} Vendor.`
    );
  };

  const handleCancelClick = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setDeactivateAlertOpen(true);
  };
  
  const handleCancelConfirm = async () => {
    if (!selectedVendor) return;
    const vendorRef = doc(firestore, "vendors", selectedVendor.id);

    if (selectedVendor.stripeSubscriptionId) {
        try {
            const result = await cancelStripeSubscription({ subscriptionId: selectedVendor.stripeSubscriptionId });
            if (!result.success) throw new Error(result.error || "Failed to cancel subscription in Stripe.");
            toast({
                title: 'Stripe Subscription Cancelled',
                description: `The subscription for ${selectedVendor.name} has been cancelled immediately.`,
            });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Stripe Error', description: e.message });
            setDeactivateAlertOpen(false);
            return;
        }
    }

    // Webhook `customer.subscription.deleted` will set status to Canceled.
    // We update here for immediate UI feedback.
    updateDocumentNonBlocking(vendorRef, { status: "Canceled", stripeSubscriptionId: null });
    toast({ variant: "destructive", title: "Vendor Subscription Canceled", description: `${selectedVendor.name}'s subscription has been canceled.` });
    createNotification('Subscription Canceled', `${selectedVendor.name}'s subscription has been canceled.`);
    setDeactivateAlertOpen(false);
    setSelectedVendor(null);
  };

  const handleDeleteClick = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setDeleteAlertOpen(true);
  }

  const handleDeleteConfirm = async () => {
    if (!selectedVendor || !firestore) return;

    const { id: vendorId, name: vendorName } = selectedVendor;

    const deletingToast = toast({
      title: 'Deleting Vendor...',
      description: `Finding all users associated with ${vendorName}.`,
    });

    try {
        // 1. Find all users for this vendor
        const usersQuery = query(collection(firestore, 'users'), where('vendorId', '==', vendorId));
        const usersSnapshot = await getDocs(usersQuery);
        const userDocs = usersSnapshot.docs;

        // 2. Create a batch write
        const batch = writeBatch(firestore);

        // 3. Add user deletions to the batch
        userDocs.forEach(userDoc => {
            batch.delete(userDoc.ref);
        });
        
        toast.update(deletingToast.id, {
            description: `Found ${userDocs.length} user(s). Preparing to delete...`,
        });

        // 4. Add the vendor deletion to the batch
        const vendorRef = doc(firestore, 'vendors', vendorId);
        batch.delete(vendorRef);
        
        // 5. Commit the batch
        await batch.commit();

        toast.update(deletingToast.id, {
            variant: 'destructive',
            title: 'Vendor & Users Deleted',
            description: `${vendorName} and all associated user records have been permanently deleted.`,
        });

    } catch (e: any) {
        toast.update(deletingToast.id, {
            variant: 'destructive',
            title: 'Deletion Failed',
            description: e.message || 'An error occurred during the deletion process.',
        });
        console.error("Cascading delete failed:", e);
    } finally {
        setDeleteAlertOpen(false);
        setSelectedVendor(null);
    }
  };
  
  const handlePauseSubscription = async (vendor: Vendor) => {
    if (!vendor.stripeSubscriptionId) return;
    const vendorRef = doc(firestore, "vendors", vendor.id);
    try {
        const result = await pauseStripeSubscription({ subscriptionId: vendor.stripeSubscriptionId });
        if (!result.success) throw new Error(result.error);
        
        // Optimistically update the UI
        updateDocumentNonBlocking(vendorRef, { status: "Paused" });
        toast({ title: "Subscription Paused", description: `${vendor.name}'s subscription is now paused.` });
        createNotification('Subscription Paused', `Paused subscription for ${vendor.name}.`);

    } catch (e: any) {
        toast({ variant: "destructive", title: "Pause Failed", description: e.message });
    }
  }

  const handleResumeSubscription = async (vendor: Vendor) => {
    if (!vendor.stripeSubscriptionId) return;
    const vendorRef = doc(firestore, "vendors", vendor.id);
    try {
        const result = await resumeStripeSubscription({ subscriptionId: vendor.stripeSubscriptionId });
        if (!result.success) throw new Error(result.error);
        
        // Optimistically update the UI
        updateDocumentNonBlocking(vendorRef, { status: "Active" });
        toast({ title: "Subscription Resumed", description: `${vendor.name}'s subscription is now active.` });
        createNotification('Subscription Resumed', `Resumed subscription for ${vendor.name}.`);
    } catch (e: any) {
        toast({ variant: "destructive", title: "Resume Failed", description: e.message });
    }
  }

  const handleEndTrial = async (vendor: Vendor) => {
    if (!vendor.stripeSubscriptionId) return;
    try {
        const result = await updateStripeSubscription({
            subscriptionId: vendor.stripeSubscriptionId,
            endTrial: true
        });
        if (!result.success) throw new Error(result.error);
        toast({ title: "Trial Ended", description: `${vendor.name}'s trial has ended and their subscription is now active. Status will update shortly.` });
    } catch (e: any) {
        toast({ variant: "destructive", title: "Failed to End Trial", description: e.message });
    }
  }

  const handleReactivate = (vendor: Vendor) => {
    const vendorRef = doc(firestore, "vendors", vendor.id);
    updateDocumentNonBlocking(vendorRef, { status: "Pending Agreement" });
    toast({
      title: "Vendor Reactivated",
      description: `${vendor.name} is now pending agreement to reactivate their subscription.`,
    });
    createNotification('Vendor Reactivated', `${vendor.name} is now pending agreement.`);
  };
  
  const handleOfferTrial = (vendor: Vendor) => {
    const vendorRef = doc(firestore, "vendors", vendor.id);
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 30);
    
    updateDocumentNonBlocking(vendorRef, { 
      status: "Trial",
      trialEnds: trialEndDate.toISOString(),
    });
    toast({
      title: "Trial Offered",
      description: `A 30-day trial has been granted to ${vendor.name}.`,
    });
    createNotification('Trial Offered', `A 30-day trial has been granted to ${vendor.name}.`);
  };

  const handleSendPasswordReset = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Password Reset Email Sent",
        description: `An email has been sent to ${email} with instructions to reset the password.`,
      });
    } catch (error: any) {
      console.error("Error sending password reset email:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send password reset email.",
      });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString || !isClient) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const getTrialStatus = (trialEnds: string | null) => {
    if (!trialEnds || !isClient) return null;
    const daysLeft = differenceInDays(new Date(trialEnds), new Date());
    if (daysLeft < 0) return 'Trial Ended';
    return `Trial (${daysLeft}d left)`;
  };


  if (!isClient) {
    return null;
  }

  const pageIsLoading = isLoading || isUserLoading;

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Vendor Management</h1>
            <p className="text-muted-foreground">
              Manage all vendor accounts on the ParkX platform.
            </p>
          </div>
          <Button onClick={() => setInviteOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Vendor
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>All Vendors</CardTitle>
            <CardDescription>
              A list of all vendors using ParkX.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by vendor or email..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Statuses</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Trial">Trial</SelectItem>
                  <SelectItem value="Pending Agreement">Pending Agreement</SelectItem>
                  <SelectItem value="Paused">Paused</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trial Ends</TableHead>
                  <TableHead>Spots</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageIsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-4 w-32 mt-1" />
                      </TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredVendors && filteredVendors.length > 0 ? (
                  filteredVendors.map((vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                           {vendor.isPrivileged && <Star className="h-4 w-4 text-yellow-500 fill-yellow-400" />}
                           <div className="font-medium">{vendor.name}</div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {vendor.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDate(vendor.joinDate)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            statusVariant[vendor.status] ?? "secondary"
                          }
                        >
                          {vendor.status === 'Trial' ? getTrialStatus(vendor.trialEnds) : vendor.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDate(vendor.trialEnds)}
                      </TableCell>
                      <TableCell>
                        {vendor.spotsUsed || 0} / {vendor.spotLimit}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              aria-haspopup="true"
                              size="icon"
                              variant="ghost"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                                <Link href={`/super-admin/vendors/${vendor.id}/edit`}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    <span>Edit Vendor Profile</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/super-admin/vendors/${vendor.id}/invoices`)}>
                              Billings &amp; Credits
                            </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => router.push(`/super-admin/vendors/${vendor.id}/documents`)}>
                                <FileText className="mr-2 h-4 w-4"/>
                                View Documents
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                             <DropdownMenuItem onClick={() => handleAdjustClick(vendor)}>
                              Adjust Spot Limit
                            </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => handleSendPasswordReset(vendor.email)}>
                              Send Password Reset
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                             {vendor.status === "Active" && (
                                <DropdownMenuItem onClick={() => handlePauseSubscription(vendor)}>
                                    <Pause className="mr-2 h-4 w-4" /> Pause Subscription
                                </DropdownMenuItem>
                            )}
                             {vendor.status === "Trial" && (
                                <DropdownMenuItem onClick={() => handleEndTrial(vendor)}>
                                    <Zap className="mr-2 h-4 w-4" /> End Trial &amp; Bill Now
                                </DropdownMenuItem>
                            )}
                            {vendor.status === "Paused" && (
                                <DropdownMenuItem onClick={() => handleResumeSubscription(vendor)}>
                                    <Play className="mr-2 h-4 w-4" /> Resume Subscription
                                </DropdownMenuItem>
                            )}
                            {(vendor.status === "Active" || vendor.status === "Paused" || vendor.status === "Trial") && (
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleCancelClick(vendor)}>
                                    <X className="mr-2 h-4 w-4" /> Cancel Subscription
                                </DropdownMenuItem>
                            )}
                             <DropdownMenuItem onClick={() => handleOfferTrial(vendor)}>
                                <Gift className="mr-2 h-4 w-4" />
                                <span>Offer 30-Day Trial</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleTogglePrivileged(vendor)}>
                              {vendor.isPrivileged ? 'Demote to Regular' : 'Promote to Privileged'}
                            </DropdownMenuItem>
                             <DropdownMenuSeparator />
                            {vendor.status === 'Canceled' || vendor.status === 'Inactive' ? (
                              <DropdownMenuItem
                                onClick={() => handleReactivate(vendor)}
                              >
                                Reactivate
                              </DropdownMenuItem>
                            ) : null}
                             <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => handleDeleteClick(vendor)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Vendor
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      {searchTerm || statusFilter !== 'All' ? 'No vendors match your filters.' : 'No vendors found. Create one to get started.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <InviteVendorDialog open={isInviteOpen} onOpenChange={setInviteOpen} />
      {selectedVendor && (
        <AdjustSpotLimitDialog
          vendor={selectedVendor}
          open={isAdjustOpen}
          onOpenChange={setAdjustOpen}
        />
      )}
      <AlertDialog open={isDeactivateAlertOpen} onOpenChange={setDeactivateAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Cancel Subscription Immediately?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently cancel the vendor's Stripe subscription, and they will lose access to the service immediately. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Back</AlertDialogCancel>
                <AlertDialogAction onClick={handleCancelConfirm} className="bg-destructive hover:bg-destructive/90">
                    Yes, Cancel Immediately
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the vendor and all their associated user records. They will lose access immediately.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
                    Yes, Delete Vendor & Users
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
