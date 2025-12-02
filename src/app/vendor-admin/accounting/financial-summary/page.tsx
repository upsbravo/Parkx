'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, Calendar as CalendarIcon, DollarSign, FileDigit, Landmark } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type Transaction = {
  id: string;
  created: number; // Unix timestamp
  amount: number; // in cents
  currency: string;
  type: 'subscription' | 'payment';
  fee?: number; // Platform fee
  net?: number; // Amount after platform fee
};

// Helper to format currency
const formatCurrency = (amountInCents?: number) => {
  if (typeof amountInCents !== 'number') return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amountInCents / 100);
};

export default function VendorFinancialSummaryPage() {
  const [date, setDate] = useState<DateRange | undefined>();
  const firestore = useFirestore();
  const { user: vendorAdmin, isUserLoading } = useUser();

  const transactionsQuery = useMemoFirebase(
    () => {
        if (!firestore || !vendorAdmin?.uid) return null;
        return query(
            collection(firestore, 'transactions'),
            where('vendorId', '==', vendorAdmin.uid),
            orderBy('created', 'desc')
        );
    },
    [firestore, vendorAdmin?.uid]
  );
  
  const { data: transactions, isLoading: areTransactionsLoading } = useCollection<Transaction>(transactionsQuery);

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    if (!date?.from) return transactions;
    
    const from = new Date(date.from.setHours(0, 0, 0, 0)).getTime() / 1000;
    const to = date.to ? new Date(date.to.setHours(23, 59, 59, 999)).getTime() / 1000 : new Date(date.from.setHours(23, 59, 59, 999)).getTime() / 1000;

    return transactions.filter(tx => tx.created >= from && tx.created <= to);
  }, [transactions, date]);

  const reportData = useMemo(() => {
    let totalGross = 0;
    let totalFees = 0;
    let totalNet = 0;

    filteredTransactions?.forEach(tx => {
      totalGross += tx.amount;
      totalFees += tx.fee || 0;
      totalNet += tx.net || 0;
    });

    return { totalGross, totalFees, totalNet };
  }, [filteredTransactions]);

  const isLoading = isUserLoading || areTransactionsLoading;


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financial Summary</h1>
            <p className="text-muted-foreground">
              A summary of all revenue, fees, and net payouts for your business.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-[300px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (
                    date.to ? (
                      <>
                        {format(date.from, "LLL dd, y")} -{" "}
                        {format(date.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(date.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={setDate}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            <Button variant="outline" disabled>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
      </div>

       <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2"/> : <div className="text-2xl font-bold">{formatCurrency(reportData.totalGross)}</div>}
            <p className="text-xs text-muted-foreground">Total payments from your users.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Fees</CardTitle>
            <FileDigit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2"/> : <div className="text-2xl font-bold">{formatCurrency(reportData.totalFees)}</div>}
            <p className="text-xs text-muted-foreground">Total processing fees paid.</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Payout</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2"/> : <div className="text-2xl font-bold">{formatCurrency(reportData.totalNet)}</div>}
            <p className="text-xs text-muted-foreground">Gross Revenue minus Platform Fees.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            Detailed breakdown of all payments for the selected period.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Gross Revenue</TableHead>
                <TableHead>Platform Fee</TableHead>
                <TableHead className="text-right font-semibold">Net Payout</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4}><Skeleton className="h-10 w-full" /></TableCell>
                </TableRow>
              ) : filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-mono text-xs">{format(new Date(tx.created * 1000), 'PPp')}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(tx.amount)}</TableCell>
                    <TableCell className="text-destructive">- {formatCurrency(tx.fee)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(tx.net)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No transactions found for the selected period.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            <TableFooter>
                <TableRow>
                    <TableCell className="font-bold">Totals</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(reportData.totalGross)}</TableCell>
                    <TableCell className="text-right font-bold text-destructive">- {formatCurrency(reportData.totalFees)}</TableCell>
                    <TableCell className="text-right font-bold text-lg">{formatCurrency(reportData.totalNet)}</TableCell>
                </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
