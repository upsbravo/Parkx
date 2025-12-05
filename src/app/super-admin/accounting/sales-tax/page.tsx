
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
import { Download, Calendar as CalendarIcon, DollarSign, FileDigit } from 'lucide-react';
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
  fee?: number;
  net?: number;
};

// Helper to format currency
const formatCurrency = (amountInCents: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format((amountInCents || 0) / 100);
};

export default function SalesTaxReportPage() {
  const [date, setDate] = useState<DateRange | undefined>();
  const firestore = useFirestore();
  const { user } = useUser();

  const transactionsQuery = useMemoFirebase(
    () => (firestore && user ? query(
        collection(firestore, 'transactions'),
        orderBy('created', 'desc')
    ) : null),
    [firestore, user]
  );
  const { data: transactions, isLoading } = useCollection<Transaction>(transactionsQuery);

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    if (!date?.from) return transactions;
    
    const from = date.from.getTime() / 1000;
    const to = date.to ? date.to.getTime() / 1000 : from + 86400; // if no 'to', use end of 'from' day

    return transactions.filter(tx => tx.created >= from && tx.created <= to);
  }, [transactions, date]);

  const reportData = useMemo(() => {
    const data: { [key: string]: { taxable: number, nonTaxable: number, platformFee: number, net: number, total: number } } = {};
    let totalGross = 0;
    let totalFees = 0;

    filteredTransactions?.forEach(tx => {
      const type = tx.type === 'subscription' ? 'Platform Subscription' : 'User Payment';
      if (!data[type]) {
        data[type] = { taxable: 0, nonTaxable: 0, platformFee: 0, net: 0, total: 0 };
      }
      // For this report, we'll assume all revenue is taxable.
      data[type].taxable += tx.amount;
      data[type].platformFee += tx.fee || 0;
      data[type].net += tx.net || 0;
      data[type].total += tx.amount;
      
      totalGross += tx.amount;
      totalFees += tx.fee || 0;
    });

    return { summarized: data, totalGross, totalFees };
  }, [filteredTransactions]);


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sales Tax Report</h1>
            <p className="text-muted-foreground">
              A summary of all revenue, fees, and net income for tax purposes.
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

       <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2"/> : <div className="text-2xl font-bold">{formatCurrency(reportData.totalGross)}</div>}
            <p className="text-xs text-muted-foreground">Total revenue from all sources.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Fees</CardTitle>
            <FileDigit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2"/> : <div className="text-2xl font-bold">{formatCurrency(reportData.totalFees)}</div>}
            <p className="text-xs text-muted-foreground">Total fees collected by the platform.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Breakdown</CardTitle>
          <CardDescription>
            Detailed breakdown of revenue by source.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Taxable</TableHead>
                <TableHead className="text-right">Non-Taxable</TableHead>
                <TableHead className="text-right">Platform Fee</TableHead>
                <TableHead className="text-right">Net Revenue</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell>
                </TableRow>
              ) : Object.keys(reportData.summarized).length > 0 ? (
                Object.entries(reportData.summarized).map(([type, values]) => (
                  <TableRow key={type}>
                    <TableCell className="font-medium">{type}</TableCell>
                    <TableCell className="text-right">{formatCurrency(values.taxable)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(values.nonTaxable)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(values.platformFee)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(values.net)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(values.total)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No transactions found for the selected period.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            <TableFooter>
                <TableRow>
                    <TableCell className="font-bold">Totals</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(Object.values(reportData.summarized).reduce((s, a) => s + a.taxable, 0))}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(Object.values(reportData.summarized).reduce((s, a) => s + a.nonTaxable, 0))}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(reportData.totalFees)}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(Object.values(reportData.summarized).reduce((s, a) => s + a.net, 0))}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(reportData.totalGross)}</TableCell>
                </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
