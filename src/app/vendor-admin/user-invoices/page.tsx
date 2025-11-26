
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { MoreHorizontal, Search, ArrowLeft, Banknote, CreditCard, Landmark, Smartphone, Trash2, CalendarIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
  } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from '@/firebase';
import { collection, doc, query } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

type UserInvoice = {
  id: string;
  userId: string;
  userName: string;
  dueDate: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue';
  notes?: string;
};

type PaymentDetails = {
    amount: number | string;
    date: Date | undefined;
    note: string;
    checkNumber: string;
    venmoId: string;
}

export default function UserInvoicesPage() {
  const [isClient, setIsClient] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isRecordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [paymentView, setPaymentView] = useState('options');
  const [selectedInvoice, setSelectedInvoice] = useState<UserInvoice | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
      amount: '',
      date: new Date(),
      note: '',
      checkNumber: '',
      venmoId: '',
  });

  useEffect(() => { setIsClient(true) }, []);
  
  useEffect(() => {
    if (selectedInvoice && isRecordPaymentOpen) {
        setPaymentDetails({
            amount: selectedInvoice.amount,
            date: new Date(),
            note: '',
            checkNumber: '',
            venmoId: '',
        });
    }
  }, [selectedInvoice, isRecordPaymentOpen]);

  const firestore = useFirestore();
  const { user: vendorAdmin } = useUser();

  const invoicesQuery = useMemoFirebase(
    () => (firestore && vendorAdmin ? collection(firestore, 'vendors', vendorAdmin.uid, 'userInvoices') : null),
    [firestore, vendorAdmin]
  );
  const { data: userInvoices, isLoading } = useCollection<UserInvoice>(invoicesQuery);

  const filteredInvoices = useMemo(() => {
    if (!userInvoices) return [];
    if (!searchTerm) return userInvoices;
    return userInvoices.filter(invoice =>
      invoice.userName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [userInvoices, searchTerm]);

  const handlePaymentDetailChange = useCallback(<K extends keyof PaymentDetails>(field: K, value: PaymentDetails[K]) => {
      setPaymentDetails(prev => ({...prev, [field]: value}));
  }, []);

  const statusVariant = { Paid: 'default', Pending: 'secondary', Overdue: 'destructive' } as const;
  
  const handleRecordPaymentClick = (invoice: UserInvoice) => {
    setSelectedInvoice(invoice);
    setPaymentView('options');
    setRecordPaymentOpen(true);
  };
  
  const handleConfirmPayment = (method: string) => {
    if (!selectedInvoice || !vendorAdmin) return;
    const amount = Number(paymentDetails.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a valid payment amount.' });
      return;
    }
    
    let details = '';
    switch (method) {
        case 'Check': details = `Check #${paymentDetails.checkNumber}.`; break;
        case 'Cash': details = `Cash payment.`; break;
        case 'Venmo': details = `Venmo ID: ${paymentDetails.venmoId}.`; break;
        case 'Zelle': details = 'Zelle payment.'; break;
        default: details = `${method}.`;
    }

    const fullNote = `Paid ${formatCurrency(amount)} via ${method} on ${format(paymentDetails.date || new Date(), 'PPP')}. ${details} Note: "${paymentDetails.note}"`;
    const invoiceRef = doc(firestore, 'vendors', vendorAdmin.uid, 'userInvoices', selectedInvoice.id);
    const updatedNotes = `${fullNote} | ${selectedInvoice.notes || ''}`.trim();

    updateDocumentNonBlocking(invoiceRef, { status: 'Paid', notes: updatedNotes });
    
    toast({ title: 'Payment Recorded', description: `Payment for ${selectedInvoice.userName} has been recorded.` });
    setRecordPaymentOpen(false);
    setSelectedInvoice(null);
  }

  const handleMarkAsUnpaid = (invoice: UserInvoice) => {
    if (!invoice || invoice.status !== 'Paid' || !vendorAdmin) return;
    const invoiceRef = doc(firestore, 'vendors', vendorAdmin.uid, 'userInvoices', invoice.id);
    updateDocumentNonBlocking(invoiceRef, { status: 'Pending' });
    toast({ title: 'Invoice Updated', description: `Invoice for ${invoice.userName} marked as Pending.` });
  };

  const handleVoidClick = (invoice: UserInvoice) => {
    setSelectedInvoice(invoice);
    setIsAlertOpen(true);
  };

  const handleVoidConfirm = () => {
    if (!selectedInvoice || !vendorAdmin) return;
    const invoiceRef = doc(firestore, 'vendors', vendorAdmin.uid, 'userInvoices', selectedInvoice.id);
    deleteDocumentNonBlocking(invoiceRef);
    toast({ variant: 'destructive', title: 'Invoice Voided', description: `Invoice for ${selectedInvoice.userName} has been deleted.` });
    setIsAlertOpen(false);
    setSelectedInvoice(null);
  };

  const formatDate = (dateString: string) => {
    if (!isClient || !dateString) return '...';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    if (!isClient || typeof amount !== 'number') return '...';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const PaymentMethodForm = ({method, children, onRecord}: {method: string, children: React.ReactNode, onRecord: () => void}) => (
    <div className="space-y-4">
        <DialogHeader>
          <DialogTitle>
            <Button variant="ghost" onClick={() => setPaymentView('options')} className="h-auto p-0 justify-start mb-4">
                <ArrowLeft className="h-4 w-4 mr-2"/>
                Receive a {method.toLowerCase()}
            </Button>
          </DialogTitle>
        </DialogHeader>
        {children}
        <Button className="w-full" onClick={onRecord}>Record</Button>
    </div>
  );

  return (
    <>
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Invoices</h1>
          <p className="text-muted-foreground">Track and manage all invoices for your users.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>All User Invoices</CardTitle>
            <CardDescription>A list of all invoices generated for your users.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by user name..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredInvoices && filteredInvoices.length > 0 ? (
                  filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.userName}</TableCell>
                      <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                      <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                      <TableCell><Badge variant={statusVariant[invoice.status]}>{invoice.status}</Badge></TableCell>
                      <TableCell className="max-w-[250px] truncate text-muted-foreground">{invoice.notes}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            {invoice.status !== 'Paid' ? (
                                <DropdownMenuItem onClick={() => handleRecordPaymentClick(invoice)}>Record Payment</DropdownMenuItem>
                             ) : (
                                <DropdownMenuItem onClick={() => handleMarkAsUnpaid(invoice)}>Mark as Unpaid</DropdownMenuItem>
                             )}
                            <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => handleVoidClick(invoice)}>Void Invoice</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">{searchTerm ? 'No invoices match your search.' : 'No invoices found.'}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      
      {selectedInvoice && (
        <Dialog open={isRecordPaymentOpen} onOpenChange={setRecordPaymentOpen}>
            <DialogContent className="sm:max-w-4xl p-0">
                <div className="grid grid-cols-1 md:grid-cols-2">
                    <div className="p-6">
                        {paymentView === 'options' && (
                            <>
                                <DialogHeader className="mb-4"><DialogTitle>New Payment</DialogTitle></DialogHeader>
                                <div className="space-y-2">
                                    <div className="space-y-2"><Label htmlFor="payment-amount">Amount</Label><div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span><Input id="payment-amount" type="number" value={paymentDetails.amount} onChange={(e) => handlePaymentDetailChange('amount', e.target.value)} className="pl-7 text-lg" /></div></div>
                                    <Button variant="outline" className="w-full" onClick={() => setPaymentView('credit')}><CreditCard className="mr-2" /> Charge a card manually</Button>
                                    <Button variant="outline" className="w-full" onClick={() => setPaymentView('check')}><Landmark className="mr-2" /> Receive a check</Button>
                                    <Button variant="outline" className="w-full" onClick={() => setPaymentView('cash')}><Banknote className="mr-2" /> Receive cash</Button>
                                    <Button variant="outline" className="w-full" onClick={() => setPaymentView('venmo')}><Smartphone className="mr-2" /> Receive via Venmo</Button>
                                    <Button variant="outline" className="w-full" onClick={() => setPaymentView('zelle')}><Smartphone className="mr-2" /> Receive via Zelle</Button>
                                </div>
                            </>
                        )}
                        {paymentView === 'credit' && (
                             <PaymentMethodForm method="Card" onRecord={() => handleConfirmPayment('Credit Card')}>
                                <div className="space-y-4">
                                    <div className="space-y-2"><Label htmlFor="payment-amount-credit">Amount</Label><div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span><Input id="payment-amount-credit" type="number" value={paymentDetails.amount} onChange={(e) => handlePaymentDetailChange('amount', e.target.value)} className="pl-7" /></div></div>
                                    <div className="space-y-2"><Label htmlFor="card-number">Card Information</Label><div className="relative"><Input id="card-number" placeholder="Card number" className="pr-12" /><div className="absolute inset-y-0 right-0 flex items-center pr-3 gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg></div></div></div>
                                    <div className="grid grid-cols-2 gap-4"><Input placeholder="MM/YY" /><Input placeholder="CVC" /></div>
                                    <div className="grid grid-cols-2 gap-4"><Input placeholder="Country" /><Input placeholder="ZIP" /></div>
                                </div>
                             </PaymentMethodForm>
                        )}
                        {paymentView === 'check' && (
                             <PaymentMethodForm method="Check" onRecord={() => handleConfirmPayment('Check')}>
                                <div className="space-y-4">
                                    <div className="space-y-2"><Label htmlFor="payment-amount-check">Amount</Label><div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span><Input id="payment-amount-check" type="number" value={paymentDetails.amount} onChange={(e) => handlePaymentDetailChange('amount', e.target.value)} className="pl-7" /></div></div>
                                    <div className="space-y-2"><Label>Date</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !paymentDetails.date && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{paymentDetails.date ? format(paymentDetails.date, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={paymentDetails.date} onSelect={(d) => handlePaymentDetailChange('date', d)} initialFocus /></PopoverContent></Popover></div>
                                    <div className="space-y-2"><Label htmlFor="check-number">Check #</Label><Input id="check-number" value={paymentDetails.checkNumber} onChange={(e) => handlePaymentDetailChange('checkNumber', e.target.value)} placeholder="1234" /></div>
                                    <div className="space-y-2"><Label htmlFor="check-note">Note</Label><Textarea id="check-note" value={paymentDetails.note} onChange={(e) => handlePaymentDetailChange('note', e.target.value)} placeholder="e.g. Payment for entire order" /></div>
                                </div>
                            </PaymentMethodForm>
                        )}
                        {paymentView === 'cash' && (
                            <PaymentMethodForm method="Cash" onRecord={() => handleConfirmPayment('Cash')}>
                                <div className="space-y-4">
                                    <div className="space-y-2"><Label htmlFor="payment-amount-cash">Amount</Label><div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span><Input id="payment-amount-cash" type="number" value={paymentDetails.amount} onChange={(e) => handlePaymentDetailChange('amount', e.target.value)} className="pl-7" /></div></div>
                                    <div className="space-y-2"><Label>Date</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !paymentDetails.date && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{paymentDetails.date ? format(paymentDetails.date, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={paymentDetails.date} onSelect={(d) => handlePaymentDetailChange('date', d)} initialFocus /></PopoverContent></Popover></div>
                                    <div className="space-y-2"><Label htmlFor="cash-note">Note</Label><Textarea id="cash-note" value={paymentDetails.note} onChange={(e) => handlePaymentDetailChange('note', e.target.value)} placeholder="Add a note..." /></div>
                                </div>
                            </PaymentMethodForm>
                        )}
                        {paymentView === 'venmo' && (
                            <PaymentMethodForm method="Venmo" onRecord={() => handleConfirmPayment('Venmo')}>
                                 <div className="space-y-4">
                                    <div className="space-y-2"><Label htmlFor="payment-amount-venmo">Amount</Label><div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span><Input id="payment-amount-venmo" type="number" value={paymentDetails.amount} onChange={(e) => handlePaymentDetailChange('amount', e.target.value)} className="pl-7" /></div></div>
                                    <div className="space-y-2"><Label>Date</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !paymentDetails.date && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{paymentDetails.date ? format(paymentDetails.date, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={paymentDetails.date} onSelect={(d) => handlePaymentDetailChange('date', d)} initialFocus /></PopoverContent></Popover></div>
                                    <div className="space-y-2"><Label htmlFor="venmo-id">Venmo ID</Label><Input id="venmo-id" value={paymentDetails.venmoId} onChange={(e) => handlePaymentDetailChange('venmoId', e.target.value)} placeholder="@username" /></div>
                                    <div className="space-y-2"><Label htmlFor="venmo-note">Note</Label><Textarea id="venmo-note" value={paymentDetails.note} onChange={(e) => handlePaymentDetailChange('note', e.target.value)} placeholder="Add a note..." /></div>
                                 </div>
                            </PaymentMethodForm>
                        )}
                        {paymentView === 'zelle' && (
                             <PaymentMethodForm method="Zelle" onRecord={() => handleConfirmPayment('Zelle')}>
                                 <div className="space-y-4">
                                     <div className="space-y-2"><Label htmlFor="payment-amount-zelle">Amount</Label><div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span><Input id="payment-amount-zelle" type="number" value={paymentDetails.amount} onChange={(e) => handlePaymentDetailChange('amount', e.target.value)} className="pl-7" /></div></div>
                                     <div className="space-y-2"><Label>Date</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !paymentDetails.date && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{paymentDetails.date ? format(paymentDetails.date, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={paymentDetails.date} onSelect={(d) => handlePaymentDetailChange('date', d)} initialFocus /></PopoverContent></Popover></div>
                                     <div className="space-y-2"><Label htmlFor="zelle-note">Note</Label><Textarea id="zelle-note" value={paymentDetails.note} onChange={(e) => handlePaymentDetailChange('note', e.target.value)} placeholder="Add a note..." /></div>
                                 </div>
                             </PaymentMethodForm>
                        )}
                    </div>
                    <div className="bg-muted/50 p-6 rounded-r-lg space-y-4">
                        <h3 className="font-semibold text-muted-foreground text-sm">ESTIMATE #{selectedInvoice.id.substring(0,6).toUpperCase()}</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span>Total Due</span><span>{formatCurrency(selectedInvoice.amount)}</span></div>
                            <div className="flex justify-between"><span>Paid to Date</span><span>$0.00</span></div>
                             <div className="flex justify-between font-semibold"><span>Amount</span><span>- {formatCurrency(Number(paymentDetails.amount))}</span></div>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold text-lg text-green-600"><span>Remaining</span><span>{formatCurrency(selectedInvoice.amount - Number(paymentDetails.amount))}</span></div>
                        <Separator />
                        <div><h4 className="font-semibold text-muted-foreground text-sm mb-2">PAYMENTS</h4><p className="text-sm text-muted-foreground">No transactions yet</p></div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete the invoice for {selectedInvoice?.userName}.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleVoidConfirm} className="bg-destructive hover:bg-destructive/90">Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
