
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Download, CreditCard, User, Building } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

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
};

export default function SuperAdminTransactionsPage() {
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
      subscription: <Building className="h-4 w-4 text-muted-foreground" />,
      payment: <User className="h-4 w-4 text-muted-foreground" />
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Global Transactions</h1>
        <p className="text-muted-foreground">
          View all payments processed across the entire platform.
        </p>
      </div>
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
                  <TableCell colSpan={7} className="h-24 text-center">
                    No transactions found.
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

