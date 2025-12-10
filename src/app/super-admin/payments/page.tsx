
'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { CreditCard, DollarSign, Search, ExternalLink, RefreshCw, Settings, Percent } from "lucide-react";
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
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

type SuperAdmin = {
    platformFeePercentage?: number;
}

type Transaction = {
  id: string;
  created: number; // Unix timestamp
  amount: number; // in cents
  currency: string;
  status: 'succeeded' | 'pending' | 'failed' | 'refunded';
  customerEmail: string;
  vendorName: string;
  receiptUrl?: string;
  type: 'subscription' | 'payment';
  fee?: number;
  net?: number;
  amountRefunded?: number;
};

export default function PlatformPaymentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [feePercentage, setFeePercentage] = useState<number | string>('');
  const [isSavingFee, setIsSavingFee] = useState(false);

  const superAdminRef = useMemoFirebase(() => (user ? doc(firestore, 'superAdmins', user.uid) : null), [user, firestore]);
  const { data: superAdminData, isLoading: isSuperAdminLoading } = useDoc<SuperAdmin>(superAdminRef);

  useEffect(() => {
    if (superAdminData && typeof superAdminData.platformFeePercentage === 'number') {
      setFeePercentage(superAdminData.platformFeePercentage);
    }
  }, [superAdminData]);

  const transactionsQuery = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, 'transactions'), orderBy('created', 'desc')) : null),
    [firestore, user]
  );
  const { data: transactions, isLoading: areTransactionsLoading } = useCollection<Transaction>(transactionsQuery);

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    if (!searchTerm) return transactions;
    return transactions.filter(
      (tx) =>
        tx.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.vendorName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [transactions, searchTerm]);

  const handleFeeSave = async () => {
    if (!superAdminRef || feePercentage === '') return;
    const fee = Number(feePercentage);
    if (isNaN(fee) || fee < 0 || fee > 100) {
      toast({
        variant: 'destructive',
        title: 'Invalid Percentage',
        description: 'Please enter a valid percentage between 0 and 100.',
      });
      return;
    }
    setIsSavingFee(true);
    try {
      await updateDocumentNonBlocking(superAdminRef, { platformFeePercentage: fee });
      toast({
        title: 'Platform Fee Updated',
        description: `The new platform fee is now ${fee}%.`,
      });
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not save the new fee.',
      });
    } finally {
      setIsSavingFee(false);
    }
  };

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
  
  const typeIcon = {
      subscription: <CreditCard className="h-4 w-4 text-muted-foreground" />,
      payment: <DollarSign className="h-4 w-4 text-muted-foreground" />
  }

  const isLoading = areTransactionsLoading || isSuperAdminLoading;

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
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Fee</TableHead>
                        <TableHead className="text-right">Net</TableHead>
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
                            <TableCell className="text-right"><Skeleton className="h-5 w-20" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-5 w-16" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-5 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
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
                            <TableCell>{tx.vendorName}</TableCell>
                            <TableCell>{tx.customerEmail}</TableCell>
                            <TableCell className="text-right">
                                {tx.status === 'refunded' && (
                                    <span className="text-destructive line-through">
                                        {formatCurrency(tx.amount, tx.currency)}
                                    </span>
                                )}
                                {tx.status !== 'refunded' && formatCurrency(tx.amount, tx.currency)}
                            </TableCell>
                            <TableCell className="text-right text-destructive">- {formatCurrency(tx.fee, tx.currency)}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(tx.net, tx.currency)}</TableCell>
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
                <Settings className="h-5 w-5" />
                <CardTitle>Platform Fee Configuration</CardTitle>
              </div>
              <CardDescription>
                Set the percentage fee your platform takes from each vendor transaction.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isSuperAdminLoading ? (
                <Skeleton className="h-24 w-1/2" />
              ) : (
                <div className="max-w-xs space-y-2">
                    <Label htmlFor="platform-fee">Platform Fee Percentage</Label>
                    <div className="relative">
                        <Input 
                            id="platform-fee"
                            type="number"
                            value={feePercentage}
                            onChange={(e) => setFeePercentage(e.target.value)}
                            placeholder="e.g., 5"
                            className="pr-8"
                        />
                        <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={handleFeeSave} disabled={isSavingFee || isSuperAdminLoading}>
                {isSavingFee ? 'Saving...' : 'Save Fee'}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                <CardTitle>Stripe Account Management</CardTitle>
              </div>
              <CardDescription>
                Manage your platform's Stripe account to receive payouts,
                set subscription pricing, and manage business details.
              </CardDescription>
            </CardHeader>
            <CardContent>
               <Button asChild>
                <Link href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer">
                    Manage on Stripe
                    <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
