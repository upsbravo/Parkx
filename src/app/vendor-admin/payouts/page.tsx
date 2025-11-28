
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DollarSign,
  CreditCard,
  Landmark,
  ExternalLink,
  Smartphone,
  BookUser,
  Star,
  FileDown,
  ListFilter,
  SlidersHorizontal,
  ArrowUpDown,
  RefreshCw,
  X,
  CalendarIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';


type Transaction = {
  id: string;
  created: number; // Unix timestamp
  amount: number; // in cents
  currency: string;
  status: 'succeeded' | 'pending' | 'failed';
  customerEmail: string;
  vendorId: string;
  receiptUrl?: string;
};

type Vendor = {
    isPrivileged?: boolean;
}

type Payout = {
    initiatedDate: string;
    arrivalDate: string;
    location: string;
    description: string;
    method: string;
    initiatedBy: string;
    total: number;
    status: 'Paid' | 'In Transit' | 'Failed';
};

const samplePayouts: Payout[] = [
    {
        initiatedDate: '06/10/2025',
        arrivalDate: '06/12/2025',
        location: 'MALWA TRUCK AND TRAILER REPAIR INC',
        description: 'STRIPE PAYOUT',
        method: 'Standard',
        initiatedBy: '',
        total: 140.77,
        status: 'Paid',
    },
    {
        initiatedDate: '06/09/2025',
        arrivalDate: '06/11/2025',
        location: 'MALWA TRUCK AND TRAILER REPAIR INC',
        description: 'STRIPE PAYOUT',
        method: 'Standard',
        initiatedBy: '',
        total: 6583.67,
        status: 'Paid',
    }
]

type VisibleColumns = {
  initiatedDate: boolean;
  estimatedArrivalDate: boolean;
  location: boolean;
  description: boolean;
  method: boolean;
  initiatedBy: boolean;
  total: boolean;
  status: boolean;
}


export default function VendorPaymentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const firestore = useFirestore();
  const { user: vendorAdmin } = useUser();
  const { toast } = useToast();

  const [accountHolder, setAccountHolder] = useState('Acme Parking Inc.');
  const [routingNumber, setRoutingNumber] = useState('••••••••123');
  const [accountNumber, setAccountNumber] = useState('••••••••456');
  const [statementDescriptor, setStatementDescriptor] = useState('ACME PARKING');

  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>({
    initiatedDate: true,
    estimatedArrivalDate: true,
    location: true,
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
    if (!firestore || !vendorAdmin) return null;
    if (vendorData?.isPrivileged) {
        return query(collection(firestore, 'transactions'), orderBy('created', 'desc'));
    }
    return query(collection(firestore, 'transactions'), where('vendorId', '==', vendorAdmin.uid), orderBy('created', 'desc'));
  }, [firestore, vendorAdmin, vendorData]);

  const { data: transactions, isLoading: areTransactionsLoading } = useCollection<Transaction>(transactionsQuery);

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    if (!searchTerm) return transactions;
    return transactions.filter(
      (tx) =>
        tx.customerEmail.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [transactions, searchTerm]);

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const handleSavePayouts = () => {
    toast({
        title: 'Payout Information Saved',
        description: 'Your bank account details have been updated.',
    });
  }

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
    Paid: 'default',
    'In Transit': 'secondary',
    Failed: 'destructive',
  } as const;

  const isLoading = areTransactionsLoading || isVendorDataLoading;
  const totalPayout = samplePayouts.reduce((acc, p) => acc + p.total, 0);


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
                        Manage your Stripe account and view your connected account details.
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
                     <p className='text-sm text-muted-foreground'>ParkX uses Stripe to process payments from your customers. You are in complete control of your funds.</p>
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
                <CardContent className="grid gap-6 sm:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <svg width="40" height="25" viewBox="0 0 40 25" fill="none" xmlns="http://www.w3.org/2000/svg" className="rounded-sm"><path d="M0 2.5C0 1.11929 1.11929 0 2.5 0H37.5C38.8807 0 40 1.11929 40 2.5V22.5C40 23.8807 38.8807 25 37.5 25H2.5C1.11929 25 0 23.8807 0 22.5V2.5Z" fill="#3A5D99"/><path d="M6 16.25V8.75H8.75L11.5 13.75L14.25 8.75H17V16.25H14.75V11.875L12.125 16.25H10.875L8.25 11.875V16.25H6Z" fill="white"/></svg>
                                <svg width="34" height="21" viewBox="0 0 34 21" fill="none" xmlns="http://www.w3.org/2000/svg" className="rounded-sm"><rect width="34" height="21" rx="3" fill="black"/><path d="M9 6H11V15H9V6Z" fill="white"/><path d="M12 6H14V15H12V6Z" fill="white"/><path d="M15 6H17V15H15V6Z" fill="white"/><path d="M18 6H20V15H18V6Z" fill="white"/><path d="M21 6H23V15H21V6Z" fill="white"/><path d="M24 6H26V15H24V6Z" fill="white"/><path d="M9.19702 10.5C9.19702 12.562 10.134 14.373 11.583 15H13.228C14.677 14.373 15.614 12.562 15.614 10.5C15.614 8.43803 14.677 6.62702 13.228 6.00002H11.583C10.134 6.62702 9.19702 8.43803 9.19702 10.5Z" fill="#FF5F00"/><path d="M17.4221 10.5C17.4221 8.81803 16.8271 7.29002 15.8901 6.22302C16.5911 6.07902 17.3191 6.00002 18.0701 6.00002C20.9161 6.00002 23.2381 8.43803 23.2381 10.5C23.2381 12.562 20.9161 15 18.0701 15C17.3191 15 16.5911 14.921 15.8901 14.777C16.8271 13.71 17.4221 12.182 17.4221 10.5Z" fill="#EB001B"/></svg>
                                <svg width="34" height="21" viewBox="0 0 34 21" fill="none" xmlns="http://www.w3.org/2000/svg" className="rounded-sm"><rect x="0.5" y="0.5" width="33" height="20" rx="2.5" fill="#F5F5F5" stroke="#E0E0E0"/><path d="M8.76172 10.375C8.76172 11.4583 8.36805 12.3958 7.57986 13.1875H6.2882C5.49306 12.3958 5.125 11.4583 5.125 10.375C5.125 9.3125 5.51875 8.375 6.3125 7.5625H7.55556C8.34931 8.375 8.76172 9.3125 8.76172 10.375Z" fill="#FF5F00"/><path d="M12.375 13.3125C13.0833 13.3125 13.625 12.75 13.625 12.0625V8.6875C13.625 8.02083 13.0833 7.4375 12.375 7.4375H10.125V13.3125H12.375Z" fill="#FF5F00"/><path d="M15.125 7.4375H17.25C17.7708 7.4375 18.125 7.8125 18.125 8.4375V12.3125C18.125 12.875 17.7917 13.3125 17.25 13.3125H15.125V7.4375Z" fill="#FF5F00"/><path d="M23.125 13.3125H21L23.125 7.4375H25.125L23.125 13.3125Z" fill="#FF5F00"/><path d="M26.375 13.3125V7.4375H28.125V13.3125H26.375Z" fill="#FF5F00"/></svg>
                                <span className="text-xs text-muted-foreground">+ more</span>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-xl font-semibold">2.9% + 30¢</p>
                                <p className="text-sm text-muted-foreground">Per Online Payment</p>
                            </div>
                            <div>
                                <p className="text-xl font-semibold">2.7% + 15¢</p>
                                <p className="text-sm text-muted-foreground">Per In-Person Payment</p>
                            </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <svg width="34" height="21" viewBox="0 0 34 21" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="34" height="21" rx="3" fill="#2E78C4"/><path d="M12.02 12.44V8.5H15.16C15.9 8.5 16.52 8.64 17.02 8.92C17.52 9.2 17.78 9.62 17.78 10.18C17.78 10.64 17.63 11.02 17.33 11.32C17.03 11.62 16.63 11.82 16.13 11.92L18.06 15H15.82L14.04 12.44H12.02ZM14.48 11.36C14.78 11.36 15.02 11.3 15.2 11.18C15.38 11.06 15.48 10.86 15.48 10.58C15.48 10.3 15.38 10.08 15.18 9.92C14.98 9.76 14.7 9.68 14.34 9.68H12.02V11.36H14.48Z" fill="white"/><path d="M23.9515 12.35V15H21.6515V8.5H25.3915C26.1115 8.5 26.6915 8.63 27.1315 8.89C27.5715 9.15 27.7915 9.5 27.7915 9.94C27.7915 10.42 27.5915 10.8 27.1915 11.08C26.7915 11.36 26.2715 11.5 25.6315 11.5H23.9515V12.35ZM23.9515 10.45H25.5315C25.9315 10.45 26.2315 10.39 26.4315 10.27C26.6315 10.15 26.7315 9.97 26.7315 9.73C26.7315 9.51 26.6315 9.33 26.4315 9.19C26.2315 9.05 25.9315 8.98 25.5315 8.98H23.9515V10.45Z" fill="white"/></svg>
                                <Switch defaultChecked/>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-xl font-semibold">3.5% + 30¢</p>
                                <p className="text-sm text-muted-foreground">Per Online Payment</p>
                            </div>
                            <div>
                                <p className="text-xl font-semibold">3.5% + 15¢</p>
                                <p className="text-sm text-muted-foreground">Per In-Person Payment</p>
                            </div>
                        </CardContent>
                    </Card>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                     <div className='flex items-center gap-2'>
                        <Landmark className="h-5 w-5 text-muted-foreground" />
                        <CardTitle>Payouts Bank Account</CardTitle>
                    </div>
                    <CardDescription>
                       Your payout schedule and connected bank account.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="account-holder">Account Holder Name</Label>
                        <Input id="account-holder" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="routing-number">Routing Number</Label>
                        <Input id="routing-number" value={routingNumber} onChange={(e) => setRoutingNumber(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="account-number">Account Number</Label>
                        <Input id="account-number" type="password" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
                    </div>
                </CardContent>
                 <CardFooter>
                    <Button onClick={handleSavePayouts}>Save Payouts</Button>
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
                        <TableCell>{formatCurrency(tx.amount / 100, tx.currency)}</TableCell>
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
                      <TableCell colSpan={5} className="h-24 text-center">
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
                                {visibleColumns.location && <TableHead><div className="flex items-center gap-1">Location <ArrowUpDown className="h-3 w-3" /></div></TableHead>}
                                {visibleColumns.description && <TableHead>Description</TableHead>}
                                {visibleColumns.method && <TableHead><div className="flex items-center gap-1">Method <ArrowUpDown className="h-3 w-3" /></div></TableHead>}
                                {visibleColumns.initiatedBy && <TableHead>Initiated By</TableHead>}
                                {visibleColumns.total && <TableHead><div className="flex items-center gap-1">Total <ArrowUpDown className="h-3 w-3" /></div></TableHead>}
                                {visibleColumns.status && <TableHead>Status</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                           {samplePayouts.map((payout, index) => (
                                <TableRow key={index}>
                                    {visibleColumns.initiatedDate && <TableCell>{payout.initiatedDate}</TableCell>}
                                    {visibleColumns.estimatedArrivalDate && <TableCell>{payout.arrivalDate}</TableCell>}
                                    {visibleColumns.location && <TableCell>{payout.location}</TableCell>}
                                    {visibleColumns.description && <TableCell>{payout.description}</TableCell>}
                                    {visibleColumns.method && <TableCell>{payout.method}</TableCell>}
                                    {visibleColumns.initiatedBy && <TableCell>{payout.initiatedBy || '-'}</TableCell>}
                                    {visibleColumns.total && <TableCell>{formatCurrency(payout.total)}</TableCell>}
                                    {visibleColumns.status && <TableCell><Badge variant={payoutStatusVariant[payout.status]}>{payout.status}</Badge></TableCell>}
                                </TableRow>
                           ))}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell colSpan={Object.values(visibleColumns).filter(v => v).length - 2} className="font-semibold">Total: {samplePayouts.length}</TableCell>
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
