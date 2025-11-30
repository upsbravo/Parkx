
'use client';

import { useState, useMemo, ChangeEvent } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreditCard, DollarSign, Search } from "lucide-react";
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
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { StripeConnectOnboarding } from '@/components/StripeConnectOnboarding';


type Transaction = {
  id: string;
  created: number; // Unix timestamp
  amount: number; // in cents
  currency: string;
  status: 'succeeded' | 'pending' | 'failed';
  customerEmail: string;
  vendorName: string;
  receiptUrl?: string;
  type: 'subscription' | 'payment';
  fee?: number;
  net?: number;
};

export default function PlatformPaymentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const firestore = useFirestore();

  const transactionsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'transactions'), orderBy('created', 'desc')) : null),
    [firestore]
  );
  const { data: transactions, isLoading } = useCollection<Transaction>(transactionsQuery);

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    if (!searchTerm) return transactions;
    return transactions.filter(
      (tx) =>
        tx.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.vendorName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [transactions, searchTerm]);

  const formatCurrency = (amountInCents: number, currency: string) => {
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
  } as const;
  
  const typeIcon = {
      subscription: <CreditCard className="h-4 w-4 text-muted-foreground" />,
      payment: <DollarSign className="h-4 w-4 text-muted-foreground" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Platform Payments
        </h1>
        <p className="text-muted-foreground">
          Configure Stripe, set pricing, and view all transactions.
        </p>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Global Transactions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="mt-6">
            <Card>
                <CardHeader>
                  <CardTitle>All Transactions</CardTitle>
                  <CardDescription>
                    A real-time log of every transaction from all vendors.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by customer email or vendor..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Fee</TableHead>
                        <TableHead>Net</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Receipt</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-20" /></TableCell>
                          </TableRow>
                        ))
                      ) : filteredTransactions.length > 0 ? (
                        filteredTransactions.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell className="font-medium">
                              {format(new Date(tx.created * 1000), 'PPp')}
                            </TableCell>
                            <TableCell>{tx.vendorName}</TableCell>
                            <TableCell>{tx.customerEmail}</TableCell>
                            <TableCell>{formatCurrency(tx.amount, tx.currency)}</TableCell>
                            <TableCell>{formatCurrency(tx.fee || 0, tx.currency)}</TableCell>
                            <TableCell>{formatCurrency(tx.net || 0, tx.currency)}</TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                   {typeIcon[tx.type]}
                                   <span className='capitalize'>{tx.type}</span>
                                </div>
                            </TableCell>
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
                          <TableCell colSpan={9} className="h-24 text-center">
                            No transactions found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                <CardTitle>Stripe Account Management</CardTitle>
              </div>
              <CardDescription>
                Connect and manage your platform's Stripe account to receive payouts,
                set subscription pricing, and manage business details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StripeConnectOnboarding />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
