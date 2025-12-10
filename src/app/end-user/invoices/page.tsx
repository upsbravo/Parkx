
'use client';

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
import { useUser, useFirestore, useMemoFirebase, useCollection, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { createStripeCheckout } from '@/ai/flows/create-stripe-checkout-flow';
import { useToast } from '@/hooks/use-toast';

type UserInvoice = {
  id: string;
  vendorId: string;
  dueDate: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue';
  notes?: string;
  userName: string;
  stripeReceiptUrl?: string; // This can be the checkout URL or the final receipt URL
};

type EndUser = {
    vendorId: string;
    stripeCustomerId?: string;
}

export default function InvoicesPage() {
  const [isClient, setIsClient] = useState(false);
  const [isPaying, setIsPaying] = useState<string | null>(null);
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const userDocRef = useMemoFirebase(
      () => (user ? doc(firestore, 'users', user.uid) : null),
      [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<EndUser>(userDocRef);

  const invoicesQuery = useMemoFirebase(
    () => (firestore && userProfile?.vendorId && user ? query(collection(firestore, `vendors/${userProfile.vendorId}/userInvoices`), where('userId', '==', user.uid)) : null),
    [firestore, user, userProfile]
  );
  const { data: invoices, isLoading: areInvoicesLoading } = useCollection<UserInvoice>(invoicesQuery);

  const isLoading = isUserLoading || isProfileLoading || areInvoicesLoading;

  const statusVariant = {
    Paid: 'default',
    Pending: 'secondary',
    Overdue: 'destructive',
  } as const;

  const formatDate = (dateString: string) => {
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
  
  const generateInvoiceContent = (invoice: UserInvoice): string => {
    return `
INVOICE
---------------------
Invoice ID: ${invoice.id}
Date Due: ${formatDate(invoice.dueDate)}
Status: ${invoice.status}

---------------------
DESCRIPTION
${invoice.notes || 'Parking Fee'}

AMOUNT
${formatCurrency(invoice.amount)}
---------------------

Total Due: ${formatCurrency(invoice.amount)}

Thank you for your business.
    `.trim();
  };

  const handleDownloadInvoice = (invoice: UserInvoice) => {
    const textContent = generateInvoiceContent(invoice);
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice_${invoice.id.substring(0, 6)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePayInvoice = async (invoice: UserInvoice) => {
    if (invoice.stripeReceiptUrl) {
        setIsPaying(invoice.id);
        window.location.href = invoice.stripeReceiptUrl;
    } else {
        toast({
            variant: 'destructive',
            title: 'Payment Link Not Found',
            description: 'A payment link for this invoice could not be found. Please contact your administrator.',
        });
    }
  };


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Invoices & Statements
        </h1>
        <p className="text-muted-foreground">
          Review your billing history and download invoices for your records.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
          <CardDescription>A list of your recent payments.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
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
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-8 w-24 inline-block" />
                    </TableCell>
                  </TableRow>
                ))
              ) : invoices && invoices.length > 0 ? (
                invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono text-xs">{invoice.id}</TableCell>
                    <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                    <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[invoice.status]}>
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{invoice.notes}</TableCell>
                    <TableCell className="text-right space-x-2">
                        {invoice.status !== 'Paid' && (
                            <Button size="sm" onClick={() => handlePayInvoice(invoice)} disabled={isPaying === invoice.id}>
                                {isPaying === invoice.id ? 'Redirecting...' : 'Pay Now'}
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleDownloadInvoice(invoice)}>
                            <Download className="h-4 w-4" />
                        </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No invoices found.
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
