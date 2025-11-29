
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
import { Download, MoreHorizontal, Info } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { differenceInDays } from 'date-fns';


type Vendor = {
    id: string;
    name: string;
    status: string;
    trialEnds: string | null;
}

type VendorInvoice = {
  id: string;
  vendorId: string;
  amount: number;
  dueDate: string; // ISO string
  status: 'Paid' | 'Pending' | 'Overdue';
  notes?: string;
}

export default function VendorInvoicesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const vendorRef = useMemoFirebase(
      () => (user ? doc(firestore, 'vendors', user.uid) : null),
      [user, firestore]
  );
  const { data: vendorData, isLoading: isVendorLoading } = useDoc<Vendor>(vendorRef);


  const invoicesQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'vendorInvoices'), where('vendorId', '==', user.uid)) : null),
    [user, firestore]
  );
  const { data: invoices, isLoading: areInvoicesLoading } = useCollection<VendorInvoice>(invoicesQuery);
  
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
  
  const generateInvoiceContent = (invoice: VendorInvoice): string => {
    return `
INVOICE FROM PARKX
---------------------
Invoice ID: ${invoice.id}
Date Due: ${formatDate(invoice.dueDate)}
Status: ${invoice.status}

BILLED TO:
${user?.displayName || 'Your Company'}

---------------------
DESCRIPTION
${invoice.notes || 'Subscription Fee'}

AMOUNT
${formatCurrency(invoice.amount)}
---------------------

Total Due: ${formatCurrency(invoice.amount)}

Thank you for your business.
    `.trim();
  };

  const handleDownloadInvoice = (invoice: VendorInvoice) => {
    const textContent = generateInvoiceContent(invoice);
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice_ParkX_${invoice.id.substring(0, 6)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

        {vendorData?.status === 'Trial' && vendorData.trialEnds && (
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>You are on a trial!</AlertTitle>
                <AlertDescription>
                    Your 30-day trial is currently active. Your first subscription payment will be charged on {formatDate(vendorData.trialEnds)}.
                    You have {trialDaysLeft > 0 ? trialDaysLeft : 0} days remaining.
                </AlertDescription>
            </Alert>
        )}

      <Card>
        <CardHeader>
          <CardTitle>My Invoice History</CardTitle>
          <CardDescription>
            A list of your monthly subscription payments to ParkX.
          </CardDescription>
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
                                    <DropdownMenuItem onClick={() => handleDownloadInvoice(invoice)}>
                                        <Download className="mr-2 h-4 w-4" />
                                        <span>Download</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                 ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No subscription invoices found.
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
