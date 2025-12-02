
'use client';

import { useState, useMemo, ChangeEvent, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreditCard, DollarSign, Search, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, orderBy, where, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { StripeConnectOnboarding } from '@/components/StripeConnectOnboarding';


type Transaction = {
  id: string;
  created: number; // Unix timestamp
  amount: number; // in cents
  currency: string;
  status: 'succeeded' | 'pending' | 'failed' | 'refunded';
  customerEmail: string;
  vendorId: string;
  receiptUrl?: string;
  fee?: number;
  net?: number;
  amountRefunded?: number;
};

type Vendor = {
    isPrivileged?: boolean;
    stripeCustomerId?: string;
}

export default function VendorPaymentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const firestore = useFirestore();
  const { user: vendorAdmin, isUserLoading } = useUser();

  const vendorRef = useMemoFirebase(
      () => (vendorAdmin ? doc(firestore, 'vendors', vendorAdmin.uid) : null),
      [vendorAdmin, firestore]
  );
  const {data: vendorData, isLoading: isVendorDataLoading} = useDoc<Vendor>(vendorRef);

  const transactionsQuery = useMemoFirebase(() => {
    if (!firestore || !vendorAdmin?.uid) return null; 

    // For privileged vendors, show all transactions across the platform.
    if (vendorData?.isPrivileged) {
      return query(collection(firestore, 'transactions'), orderBy('created', 'desc'));
    }

    // For regular vendors, it is REQUIRED to filter by their vendorId to comply with security rules.
    return query(
      collection(firestore, 'transactions'),
      where('vendorId', '==', vendorAdmin.uid),
      orderBy('created', 'desc')
    );
  }, [firestore, vendorAdmin?.uid, vendorData?.isPrivileged]);


  const { data: transactions, isLoading: areTransactionsLoading } = useCollection<Transaction>(transactionsQuery);

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    if (!searchTerm) return transactions;
    return transactions.filter(
      (tx) =>
        tx.customerEmail.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [transactions, searchTerm]);

  const formatCurrency = (amountInCents: number | undefined, currency: string = 'usd') => {
    if (typeof amountInCents !== 'number') return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amountInCents / 100);
  };

  const statusVariant = {
    succeeded: 'default',
    pending: 'secondary',
    failed: 'destructive',
    refunded: 'outline',
  } as const;
  
  const isLoading = isUserLoading || areTransactionsLoading || isVendorDataLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Payments & Payouts
        </h1>
        <p className="text-muted-foreground">
          Manage your payments, payouts, and billing settings.
        </p>
      </div>

      <Tabs defaultValue="account">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="payouts" disabled>Payouts</TabsTrigger>
          <TabsTrigger value="readers" disabled>Readers</TabsTrigger>
          <TabsTrigger value="ach" disabled>ACH</TabsTrigger>
          <TabsTrigger value="bnpl" disabled>Buy Now Pay Later</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="mt-6">
          <Card>
            <CardHeader>
                <div className='flex items-center gap-2'>
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>Stripe Account</CardTitle>
                </div>
                <CardDescription>
                    Manage your Stripe account and update your bank details for payouts. This is required to receive money from your customers.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <StripeConnectOnboarding />
            </CardContent>
        </Card>
        </TabsContent>
        <TabsContent value="transactions" className="mt-6">
           <Card>
            <CardHeader>
              <CardTitle>My Transactions</CardTitle>
              <CardDescription>
                A real-time log of every payment from your users.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by customer email..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Net</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Receipt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredTransactions.length > 0 ? (
                    filteredTransactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-mono text-xs">
                          {format(new Date(tx.created * 1000), 'PPp')}
                        </TableCell>
                        <TableCell>{tx.customerEmail}</TableCell>
                        <TableCell>
                             {tx.status === 'refunded' && (
                                <span className="text-destructive line-through">
                                    {formatCurrency(tx.amount, tx.currency)}
                                </span>
                            )}
                            {tx.status !== 'refunded' && formatCurrency(tx.amount, tx.currency)}
                        </TableCell>
                        <TableCell className="text-destructive">- {formatCurrency(tx.fee, tx.currency)}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(tx.net, tx.currency)}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant[tx.status]}>{tx.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {tx.receiptUrl ? (
                            <Button variant="outline" size="sm" asChild>
                              <a href={tx.receiptUrl} target="_blank" rel="noopener noreferrer">
                                View
                              </a>
                            </Button>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        No transactions found.
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
  );
}
