
'use client';

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
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

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
        total: 140.77,
        status: 'Paid',
    },
    {
        initiatedDate: '06/09/2025',
        arrivalDate: '06/11/2025',
        location: 'MALWA TRUCK AND TRAILER REPAIR INC',
        description: 'STRIPE PAYOUT',
        method: 'Standard',
        total: 6583.67,
        status: 'Paid',
    }
]


export default function VendorPaymentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const firestore = useFirestore();
  const { user: vendorAdmin } = useUser();
  const { toast } = useToast();

  const [accountHolder, setAccountHolder] = useState('Acme Parking Inc.');
  const [routingNumber, setRoutingNumber] = useState('••••••••123');
  const [accountNumber, setAccountNumber] = useState('••••••••456');
  const [statementDescriptor, setStatementDescriptor] = useState('ACME PARKING');

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

            <Card>
                <CardHeader>
                     <div className='flex items-center gap-2'>
                        <DollarSign className="h-5 w-5 text-muted-foreground" />
                        <CardTitle>Rates & Fees</CardTitle>
                    </div>
                    <CardDescription>
                       The fees applied to each transaction.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                   <div className="flex justify-between items-center text-sm">
                        <p className="text-muted-foreground">ParkX Platform Fee</p>
                        <p className="font-medium">10%</p>
                   </div>
                    <div className="flex justify-between items-center text-sm">
                        <p className="text-muted-foreground">Stripe Processing Fee</p>
                        <p className="font-medium">~2.9% + 30¢</p>
                   </div>
                    <Separator/>
                     <div className="flex justify-between items-center text-sm font-semibold">
                        <p>You Receive (approx.)</p>
                        <p>~87.1%</p>
                   </div>
                </CardContent>
                 <CardFooter className="flex-col items-start gap-2 text-xs text-muted-foreground">
                    <p>The Stripe processing fee is an estimate and may vary.</p>
                    <p>ParkX platform fees are deducted automatically from each transaction.</p>
                </CardFooter>
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
                    onChange={(e) => setSearchTerm(e.target.value)}
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
                        <Button variant="outline" size="sm"><ListFilter className="mr-2 h-4 w-4" /> Filters</Button>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm"><FileDown className="mr-2 h-4 w-4" /> Export XLS</Button>
                            <Button variant="outline" size="sm"><SlidersHorizontal className="mr-2 h-4 w-4" /> Customize</Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Initiated Date</TableHead>
                                <TableHead>Estimated Arrival Date</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                           {samplePayouts.map((payout, index) => (
                                <TableRow key={index}>
                                    <TableCell>{payout.initiatedDate}</TableCell>
                                    <TableCell>{payout.arrivalDate}</TableCell>
                                    <TableCell>{payout.location}</TableCell>
                                    <TableCell>{payout.description}</TableCell>
                                    <TableCell>{payout.method}</TableCell>
                                    <TableCell>{formatCurrency(payout.total)}</TableCell>
                                    <TableCell><Badge variant={payoutStatusVariant[payout.status]}>{payout.status}</Badge></TableCell>
                                </TableRow>
                           ))}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell colSpan={5} className="font-semibold">Total: {samplePayouts.length}</TableCell>
                                <TableCell className="font-semibold">{formatCurrency(totalPayout)}</TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

    