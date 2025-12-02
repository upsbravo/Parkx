'use client';

import { useState, useMemo, ChangeEvent } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CreditCard, DollarSign, Search } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

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
                <CardContent className="space-y-4">
                     <div className="flex items-center justify-between rounded-lg border bg-card p-4">
                        <div>
                            <p className="text-sm font-medium">Acme Parking Inc.</p>
                            <p className="text-sm text-muted-foreground">acct_123...xyz</p>
                        </div>
                        <Badge variant="default">Enabled</Badge>
                    </div>
                     <p className='text-sm text-muted-foreground'>ParkX uses Stripe to process payments from your customers. Click below to securely manage your account details, including your bank account for payouts.</p>
                </CardContent>
                <CardFooter>
                     <Button variant="outline">
                        Manage on Stripe <ExternalLink className='ml-2 h-4 w-4'/>
                    </Button>
                </CardFooter>
            </Card>
             <Card className="col-span-1 md:col-span-2">
                <CardHeader>
                     <div className='flex items-center gap-2'>
                        <DollarSign className="h-5 w-5 text-muted-foreground" />
                        <CardTitle>Rates</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                     <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <svg width="24" height="16" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4"><rect width="23.75" height="15.625" rx="2.5" fill="#2664D4"/><path fillRule="evenodd" clipRule="evenodd" d="M11.642 3.82857H8.83581L8.25781 12.1429H11.064L11.642 3.82857ZM6.90154 3.82857L4.74725 12.1429H1.83516L3.98945 3.82857H6.90154ZM12.3516 8.01604C12.3516 7.02813 13.3443 6.30725 14.3022 6.30725C15.26 6.30725 15.8212 6.84571 15.8385 7.42461L15.0385 7.28176C14.9398 6.94066 14.6736 6.77 14.2857 6.77C13.8099 6.77 13.5264 7.04538 13.5264 7.49505C13.5264 7.8189 13.7253 8.01604 14.1648 8.17648L14.656 8.35429C15.3484 8.62967 15.7582 9.07934 15.7582 9.78637C15.7582 10.7038 14.9055 11.2424 13.9121 11.2424C12.8308 11.2424 12.2352 10.6692 12.1648 10.0772L12.9648 10.22C13.0462 10.5793 13.3648 10.7765 13.8264 10.7765C14.3648 10.7765 14.6308 10.5109 14.6308 10.0772C14.6308 9.87999 14.4967 9.68285 13.9967 9.48571L13.5352 9.32527C12.8429 9.0678 12.3516 8.64736 12.3516 8.01604ZM19.989 3.82857H22.1433L19.4993 12.1429H17.4725L16.033 6.44461C15.9343 6.03483 15.8696 5.86934 15.4879 5.86934C15.3352 5.86934 15.0516 5.95549 14.9516 5.98505L15.1176 3.49022C15.3176 3.44593 15.6527 3.44593 16.2143 3.37109C17.2791 3.37109 17.8571 3.98593 18.0989 4.9034L18.9945 8.74241L19.989 3.82857Z" fill="white"/></svg>
                                <svg width="25" height="15" viewBox="0 0 25 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4"><path d="M12.2133 14.1167C18.23 14.1167 23.2133 10.95 23.2133 7.05833C23.2133 3.16667 18.23 0 12.2133 0C6.2 0 1.21332 3.16667 1.21332 7.05833C1.21332 10.95 6.2 14.1167 12.2133 14.1167Z" fill="#F79E1B"/><path d="M8.28333 7.05833C8.28333 4.81667 9.94667 2.95 12.2167 2.95C14.4867 2.95 16.15 4.81667 16.15 7.05833C16.15 9.3 14.4867 11.1667 12.2167 11.1667C9.94667 11.1667 8.28333 9.3 8.28333 7.05833Z" fill="#EB001B"/><path d="M19.1462 7.05833C19.1462 9.3 17.4828 11.1667 15.2128 11.1667C15.7195 10.1583 16.1495 8.73333 16.1495 7.05833C16.1495 5.38333 15.7195 3.95833 15.2128 2.95C17.4828 2.95 19.1462 4.81667 19.1462 7.05833Z" fill="#00A1DF"/></svg>
                                <svg width="24" height="15" viewBox="0 0 24 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4"><path d="M22.9536 2.07922C22.9536 1.03961 21.9961 0.207031 20.8036 0.207031H3.19302C1.99687 0.207031 1.04297 1.03961 1.04297 2.07922V12.4753C1.04297 13.5149 1.99687 14.3475 3.19302 14.3475H20.8036C21.9961 14.3475 22.9536 13.5149 22.9536 12.4753V2.07922Z" fill="#3A5D99"/><path d="M6 10.9375V4.625H8.75L11.5 8.9375L14.25 4.625H17V10.9375H14.75V7.59375L12.125 10.9375H10.875L8.25 7.59375V10.9375H6Z" fill="white"/></svg>
                                <svg width="23" height="15" viewBox="0 0 23 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4"><path d="M21.9845 1.55859C21.9845 0.779297 21.2267 0.15625 20.3048 0.15625H2.3302C1.40833 0.15625 0.652466 0.779297 0.652466 1.55859V12.8633C0.652466 13.6426 1.40833 14.2656 2.3302 14.2656H20.3048C21.2267 14.2656 21.9845 13.6426 21.9845 12.8633V1.55859Z" fill="#FF5F00"/><path d="M12.5976 11.0801H15.0117L15.3242 9.54492H13.6367L13.4414 8.5293H15.4218L15.7343 7.02734H13.246L13.0117 5.76562H10.7304L7.30071 11.0801H9.7929L10.3632 8.36914L11.6054 11.0801H12.5976Z" fill="#424242"/></svg>
                                <span className="text-xs text-muted-foreground">+ more</span>
                            </div>
                        </CardHeader>
                        <CardContent>
                             <div>
                                <p className="text-xl font-semibold">2.9% + 30¢</p>
                                <p className="text-sm text-muted-foreground">Per Online Payment</p>
                            </div>
                        </CardContent>
                    </Card>
                </CardContent>
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
