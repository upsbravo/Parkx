// src/app/vendor-admin/invoices/page.tsx

'use client';

import { useState, useMemo } from 'react';
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
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { createStripeCheckout } from '@/ai/flows/create-stripe-checkout-flow';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';

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
  const { toast } = useToast();
  const [isSubscribing, setIsSubscribing] = useState(false);

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

  const handleSubscribe = async () => {
    setIsSubscribing(true);
    toast({
      title: 'Redirecting to Stripe...',
      description: 'Please wait while we create your secure checkout session.',
    });

    try {
      // This is a placeholder product ID. You would create this product in your Stripe Dashboard
      // and add the corresponding Price ID to a document in your Firestore `products` collection.
      const productId = process.env.NEXT_PUBLIC_STRIPE_PRODUCT_ID || 'prod_YOUR_PRODUCT_ID'; // Replace with your actual product ID from Firestore
      
      const result = await createStripeCheckout({
        priceId: productId, 
        successUrl: window.location.href,
        cancelUrl: window.location.href,
      });

      if (result.url) {
        window.location.assign(result.url);
      } else {
        throw new Error('Could not retrieve checkout URL.');
      }
    } catch (error: any) {
      console.error('Stripe checkout error:', error);
      toast({
        variant: 'destructive',
        title: 'Subscription Failed',
        description: error.message || 'Could not redirect to Stripe. Please try again.',
      });
      setIsSubscribing(false);
    }
  };

  const isLoading = isUserLoading || areInvoicesLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Invoices</h1>
        <p className="text-muted-foreground">
          Review your billing history for your ParkX subscription.
        </p>
      </div>
      
       <Card>
        <CardHeader>
          <CardTitle>Manage Subscription</CardTitle>
          <CardDescription>
            Use the button below to subscribe or manage your billing information through our secure Stripe portal.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <Button onClick={handleSubscribe} disabled={isSubscribing}>
              {isSubscribing ? 'Redirecting...' : 'Subscribe & Manage Billing'}
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
        </CardContent>
      </Card>

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
                        <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                        <TableCell>${invoice.amount.toFixed(2)}</TableCell>
                        <TableCell>
                            <Badge variant={statusVariant[invoice.status]}>
                                {invoice.status}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                            <Button variant="outline" size="sm">View</Button>
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
