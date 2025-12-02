
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
import { CreditCard, DollarSign, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, orderBy, where, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { StripeConnectOnboarding } from '@/components/StripeConnectOnboarding';
import { Landmark, ExternalLink, Smartphone, BookUser, Star, FileDown, ListFilter, SlidersHorizontal, ArrowUpDown, RefreshCw, X, CalendarIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { createStripePortalSession } from '@/ai/flows/create-stripe-portal-session-flow';

type Transaction = {
  id: string;
  created: number; // Unix timestamp
  amount: number; // in cents
  currency: string;
  status: 'succeeded' | 'pending' | 'failed';
  customerEmail: string;
  vendorId: string;
  receiptUrl?: string;
  fee?: number;
  net?: number;
};

type Vendor = {
    isPrivileged?: boolean;
    stripeCustomerId?: string;
}

type Payout = {
    id: string;
    amount: number;
    currency: string;
    arrival_date: number;
    created: number;
    status: string;
    type: string;
    description: string;
};


type VisibleColumns = {
  initiatedDate: boolean;
  estimatedArrivalDate: boolean;
  description: boolean;
  method: boolean;
  initiatedBy: boolean; // Hidden by default as in screenshot
  total: boolean;
  status: boolean;
}


export default function VendorPaymentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const firestore = useFirestore();
  const { user: vendorAdmin, isUserLoading } = useUser();
  const { toast } = useToast();

  const [statementDescriptor, setStatementDescriptor] = useState('ACME PARKING');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>({
    initiatedDate: true,
    estimatedArrivalDate: true,
    description: true,
    method: true,
    initiatedBy: false, // Hidden by default as in screenshot
    total: true,
    status: true,
  });


  const vendorRef = useMemoFirebase(
      () => (vendorAdmin ? doc(firestore, 'vendors', vendorAdmin.uid) : null),
      [vendorAdmin, firestore]
  );
  const {data: vendorData, isLoading: isVendorDataLoading} = useDoc<Vendor>(vendorRef);

  const transactionsQuery = useMemoFirebase(() => {
    if (!firestore || !vendorAdmin?.uid) return null; // Wait for vendorAdmin.uid

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

  const payoutsQuery = useMemoFirebase(() => {
    if (!firestore || !vendorAdmin) return null;
    return query(collection(firestore, 'vendors', vendorAdmin.uid, 'payouts'), orderBy('created', 'desc'));
  }, [firestore, vendorAdmin]);

  const { data: payouts, isLoading: arePayoutsLoading } = useCollection<Payout>(payoutsQuery);

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    if (!searchTerm) return transactions;
    return transactions.filter(
      (tx) =>
        tx.customerEmail.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [transactions, searchTerm]);

  const formatCurrency = (amount: number, currency = 'USD') => {
    if (typeof amount !== 'number') return '-';
    // Payout amounts are in cents/smallest unit
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };


  const handleSaveDescriptor = () => {
     toast({
        title: 'Statement Descriptor Saved',
        description: 'Your changes will appear on customer statements within 24 hours.',
    });
  }

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


  const statusVariant = {
    succeeded: 'default',
    pending: 'secondary',
    failed: 'destructive',
  } as const;

  const payoutStatusVariant = {
    paid: 'default',
    in_transit: 'secondary',
    failed: 'destructive',
    pending: 'secondary',
  } as const;

  const isLoading = isUserLoading || areTransactionsLoading || isVendorDataLoading || arePayoutsLoading;
  const totalPayout = payouts?.reduce((acc, p) => acc + p.amount, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground">
            Manage your payments, payouts, and billing settings.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Active</div>
            <p className="text-xs text-muted-foreground">
              You can accept online payments.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payouts</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Enabled</div>
            <p className="text-xs text-muted-foreground">
              Payouts are sent to your bank account.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In-Person Payments</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Not Active</div>
            <p className="text-xs text-muted-foreground">
              Contact support to enable readers.
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="account">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
          <TabsTrigger value="readers" disabled>Readers</TabsTrigger>
          <TabsTrigger value="ach" disabled>ACH</TabsTrigger>
          <TabsTrigger value="bnpl" disabled>Buy Now Pay Later</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <div className='flex items-center gap-2'>
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                        <CardTitle>Stripe Account</CardTitle>
                    </div>
                    <CardDescription>
                        Manage your Stripe account and update your bank details for payouts.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <StripeConnectOnboarding />
                </CardContent>
                <CardFooter>
                     <Button variant="outline" onClick={handleManageBilling} disabled={isSubmitting}>
                        Manage on Stripe <ExternalLink className='ml-2 h-4 w-4'/>
                    </Button>
                </CardFooter>
            </Card>
             <Card>
                <CardHeader>
                     <div className='flex items-center gap-2'>
                        <BookUser className="h-5 w-5 text-muted-foreground" />
                        <CardTitle>Statement Descriptor</CardTitle>
                    </div>
                    <CardDescription>
                       How charges will appear on your customers' bank statements.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                     <Label htmlFor="statement-descriptor">Descriptor</Label>
                    <Input id="statement-descriptor" value={statementDescriptor} onChange={(e) => setStatementDescriptor(e.target.value)} />
                    <p className="text-xs text-muted-foreground">This helps customers recognize their payments to you.</p>
                </CardContent>
                  <CardFooter>
                    <Button onClick={handleSaveDescriptor}>Save Descriptor</Button>
                </CardFooter>
            </Card>

          </div>
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
                        <TableCell className="font-medium">
                          {format(new Date(tx.created * 1000), 'PPp')}
                        </TableCell>
                        <TableCell>{tx.customerEmail}</TableCell>
                        <TableCell>{formatCurrency(tx.amount, tx.currency)}</TableCell>
                        <TableCell>{formatCurrency(tx.fee || 0, tx.currency)}</TableCell>
                        <TableCell>{formatCurrency(tx.net || 0, tx.currency)}</TableCell>
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
        <TabsContent value="payouts" className="mt-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight">Payouts</h2>
                    <p className="text-muted-foreground">Record of payments to your bank account.</p>
                </div>
                 <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon"><Star className="h-5 w-5" /></Button>
                    <Button variant="outline">Save New Report</Button>
                </div>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader><CardTitle>$0.00</CardTitle></CardHeader>
                    <CardContent><p className="text-sm text-muted-foreground">In Transit — No current in-transit payout</p></CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>$144.22</CardTitle></CardHeader>
                    <CardContent><p className="text-sm text-muted-foreground">Remaining Balance <a href="#" className="text-primary underline">What is this?</a></p></CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <Button variant="outline" size="sm" onClick={() => setIsFiltersOpen(true)}><ListFilter className="mr-2 h-4 w-4" /> Filters</Button>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm"><FileDown className="mr-2 h-4 w-4" /> Export XLS</Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm"><SlidersHorizontal className="mr-2 h-4 w-4" /> Customize</Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Columns</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {Object.keys(visibleColumns).map((key) => (
                                        <DropdownMenuCheckboxItem
                                            key={key}
                                            checked={visibleColumns[key as keyof VisibleColumns]}
                                            onCheckedChange={(checked) => setVisibleColumns(prev => ({...prev, [key]: checked}))}
                                        >
                                           {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {visibleColumns.initiatedDate && <TableHead><div className="flex items-center gap-1">Initiated Date <ArrowUpDown className="h-3 w-3" /></div></TableHead>}
                                {visibleColumns.estimatedArrivalDate && <TableHead><div className="flex items-center gap-1">Estimated Arrival Date <ArrowUpDown className="h-3 w-3" /></div></TableHead>}
                                {visibleColumns.description && <TableHead>Description</TableHead>}
                                {visibleColumns.method && <TableHead><div className="flex items-center gap-1">Method <ArrowUpDown className="h-3 w-3" /></div></TableHead>}
                                {visibleColumns.initiatedBy && <TableHead>Initiated By</TableHead>}
                                {visibleColumns.total && <TableHead><div className="flex items-center gap-1">Total <ArrowUpDown className="h-3 w-3" /></div></TableHead>}
                                {visibleColumns.status && <TableHead>Status</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                           {isLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}><TableCell colSpan={Object.values(visibleColumns).filter(v => v).length}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                                ))
                           ) : payouts && payouts.length > 0 ? (
                            payouts.map((payout) => (
                                <TableRow key={payout.id}>
                                    {visibleColumns.initiatedDate && <TableCell>{format(new Date(payout.created * 1000), 'PP')}</TableCell>}
                                    {visibleColumns.estimatedArrivalDate && <TableCell>{format(new Date(payout.arrival_date * 1000), 'PP')}</TableCell>}
                                    {visibleColumns.description && <TableCell className="capitalize">{payout.description || '-'}</TableCell>}
                                    {visibleColumns.method && <TableCell className="capitalize">{payout.type}</TableCell>}
                                    {visibleColumns.initiatedBy && <TableCell>{'-'}</TableCell>}
                                    {visibleColumns.total && <TableCell>{formatCurrency(payout.amount, payout.currency)}</TableCell>}
                                    {visibleColumns.status && <TableCell><Badge variant={payoutStatusVariant[payout.status as keyof typeof payoutStatusVariant]}>{payout.status}</Badge></TableCell>}
                                </TableRow>
                           ))) : (
                            <TableRow>
                                <TableCell colSpan={Object.values(visibleColumns).filter(v => v).length} className="h-24 text-center">
                                    No payouts found.
                                </TableCell>
                            </TableRow>
                           )}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell colSpan={Object.values(visibleColumns).filter(v => v).length - 2} className="font-semibold">Total: {payouts?.length || 0}</TableCell>
                                <TableCell className="font-semibold">{formatCurrency(totalPayout)}</TableCell>
                                {visibleColumns.status && <TableCell></TableCell>}
                            </TableRow>
                        </TableFooter>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
      <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
        <SheetContent className="w-[350px] sm:w-[400px]">
            <SheetHeader className="flex-row items-center justify-between mb-4">
                <SheetTitle>Filters</SheetTitle>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon"><RefreshCw className="h-4 w-4" /></Button>
                    <SheetClose asChild><Button variant="ghost" size="icon"><X className="h-4 w-4" /></Button></SheetClose>
                </div>
            </SheetHeader>
            <div className="space-y-6">
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label className="font-semibold">Arrival</Label>
                        <Button variant="link" className="p-0 h-auto">Reset</Button>
                    </div>
                    <RadioGroup defaultValue="custom" className="space-y-2">
                        <div>
                            <RadioGroupItem value="custom" id="custom" className="peer sr-only" />
                            <Label htmlFor="custom" className="block rounded-md border p-4 cursor-pointer peer-data-[state=checked]:border-primary">
                                <p className="font-semibold">Custom</p>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="font-normal w-full"><CalendarIcon className="mr-2 h-4 w-4" /> {format(new Date(), "MM/dd/yyyy")}</Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0"><Calendar mode="single" /></PopoverContent>
                                    </Popover>
                                     <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="font-normal w-full"><CalendarIcon className="mr-2 h-4 w-4" /> {format(new Date(), "MM/dd/yyyy")}</Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0"><Calendar mode="single" /></PopoverContent>
                                    </Popover>
                                </div>
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="today" id="today" /><Label htmlFor="today">Today</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="yesterday" id="yesterday" /><Label htmlFor="yesterday">Yesterday</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="this-week" id="this-week" /><Label htmlFor="this-week">This Week (M-Su)</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="last-week" id="last-week" /><Label htmlFor="last-week">Last Week (M-Su)</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="this-month" id="this-month" /><Label htmlFor="this-month">This Month</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="last-month" id="last-month" /><Label htmlFor="last-month">Last Month</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="year-to-date" id="year-to-date" /><Label htmlFor="year-to-date">Year to Date</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="all-time" id="all-time" /><Label htmlFor="all-time">All Time</Label></div>
                    </RadioGroup>
                </div>
            </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
