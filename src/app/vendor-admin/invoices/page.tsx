

// src/app/vendor-admin/invoices/page.tsx

'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Download, MoreHorizontal, Info, LifeBuoy, ExternalLink, RefreshCw } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { differenceInDays, format } from 'date-fns';
import { createStripePortalSession } from '@/ai/flows/create-stripe-portal-session-flow';
import { syncStripeInvoices } from '@/ai/flows/sync-stripe-invoices-flow';
import { cn } from '@/lib/utils';


type Vendor = {
    id: string;
    name: string;
    status: string;
    trialEnds: string | null;
    stripeCustomerId?: string;
}

type VendorInvoice = {
  id: string;
  vendorId: string;
  amount: number;
  dueDate: string; // ISO string
  status: 'Paid' | 'Pending' | 'Overdue';
  notes?: string;
  stripeInvoicePdfUrl?: string;
}

export default function VendorInvoicesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const vendorRef = useMemoFirebase(
      () => (user ? doc(firestore, 'vendors', user.uid) : null),
      [user, firestore]
  );
  const { data: vendorData, isLoading: isVendorLoading } = useDoc<Vendor>(vendorRef);


  const invoicesQuery = useMemoFirebase(
    () => (user && user.uid ? query(collection(firestore, 'vendorInvoices'), where('vendorId', '==', user.uid)) : null),
    [user, firestore]
  );
  const { data: invoices, isLoading: areInvoicesLoading, refetch: refetchInvoices } = useCollection<VendorInvoice>(invoicesQuery);
  
  const statusVariant = {
    Paid: 'default',
    Pending: 'secondary',
    Overdue: 'destructive',
  } as const;

  const formatDate = (dateString: string | null) => {
    if (!isClient || !dateString) return '...';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    if (!isClient || typeof amount !== 'number') return '...';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  const handleDownloadInvoice = (invoice: VendorInvoice) => {
    if (invoice.stripeInvoicePdfUrl) {
        window.open(invoice.stripeInvoicePdfUrl, '_blank');
    } else {
        toast({
            variant: 'destructive',
            title: 'No PDF Available',
            description: 'A PDF is not yet available for this invoice. It will be generated upon payment.',
        });
    }
  };

  const handleManageBilling = async () => {
    if (isSubmitting || !vendorData || !vendorData.stripeCustomerId) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: vendorData?.stripeCustomerId ? 'An operation is already in progress.' : 'Your Stripe customer account is not set up.'
        });
        return;
    }

    setIsSubmitting(true);
    toast({ title: 'Generating Portal Link...' });

    try {
        const result = await createStripePortalSession({
            customerId: vendorData.stripeCustomerId,
            returnUrl: window.location.href,
        });

        if (result.url) {
            window.location.href = result.url;
        } else {
            throw new Error(result.error || 'Failed to get customer portal URL.');
        }
    } catch (e: any) {
        console.error("Error creating portal session:", e);
        toast({
            variant: 'destructive',
            title: 'Failed to Open Billing Portal',
            description: e.message || 'An unexpected error occurred.',
        });
        setIsSubmitting(false);
    }
  };

  const handleSyncInvoices = async () => {
    if (!vendorData?.stripeCustomerId || !user?.uid) {
        toast({ variant: 'destructive', title: 'Error', description: 'Stripe Customer ID not found.' });
        return;
    }
    setIsSyncing(true);
    try {
        const result = await syncStripeInvoices({ 
            stripeCustomerId: vendorData.stripeCustomerId,
            vendorId: user.uid 
        });
        if (result.success) {
            toast({
                title: 'Sync Complete',
                description: `${result.syncedCount} new invoice(s) have been synced from Stripe.`,
            });
            if (refetchInvoices) {
                refetchInvoices();
            }
        } else {
            throw new Error(result.error || 'Unknown sync error.');
        }
    } catch (e: any) {
        toast({
            variant: 'destructive',
            title: 'Sync Failed',
            description: e.message,
        });
    } finally {
        setIsSyncing(false);
    }
  };


  const isLoading = isUserLoading || areInvoicesLoading || isVendorLoading;

  const trialDaysLeft = vendorData?.trialEnds ? differenceInDays(new Date(vendorData.trialEnds), new Date()) : 0;


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Invoices</h1>
        <p className="text-muted-foreground">
          Review your billing history for your ParkX subscription.
        </p>
      </div>

        {vendorData?.status === 'Trial' && vendorData.trialEnds && trialDaysLeft > 0 && (
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>You are on a trial!</AlertTitle>
                <AlertDescription>
                    Your 30-day trial is currently active. Your first subscription payment will be charged on {formatDate(vendorData.trialEnds)}.
                    You have {trialDaysLeft} days remaining.
                </AlertDescription>
            </Alert>
        )}

        {vendorData?.status === 'Active' && (
            <Alert variant="default">
                <LifeBuoy className="h-4 w-4" />
                <AlertTitle>Subscription Management</AlertTitle>
                <AlertDescription className="flex justify-between items-center">
                    <span>To manage your payment methods, please use the Stripe Customer Portal. To cancel your subscription, you must contact ParkX support directly.</span>
                    <Button onClick={handleManageBilling} disabled={isSubmitting || isLoading} size="sm">
                        Manage Billing <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                </AlertDescription>
            </Alert>
        )}


      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>My Invoice History</CardTitle>
                <CardDescription>
                    A list of your monthly subscription payments to ParkX.
                </CardDescription>
            </div>
            <Button variant="outline" onClick={handleSyncInvoices} disabled={isSyncing || isLoading}>
                <RefreshCw className={cn("mr-2 h-4 w-4", isSyncing && "animate-spin")} />
                {isSyncing ? 'Syncing...' : 'Sync with Stripe'}
            </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-8 w-8 inline-block" />
                    </TableCell>
                  </TableRow>
                ))
              ) : invoices && invoices.length > 0 ? (
                 invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                        <TableCell className="font-mono text-xs max-w-xs truncate">{invoice.id}</TableCell>
                        <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                        <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                        <TableCell>
                            <Badge variant={statusVariant[invoice.status]}>
                                {invoice.status}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
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
                                    <DropdownMenuItem onClick={() => handleDownloadInvoice(invoice)} disabled={!invoice.stripeInvoicePdfUrl}>
                                        <Download className="mr-2 h-4 w-4" />
                                        <span>Download PDF</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                 ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No subscription invoices found. Try syncing with Stripe.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
