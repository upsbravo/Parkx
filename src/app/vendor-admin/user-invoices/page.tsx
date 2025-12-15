

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
import { MoreHorizontal, Search, ArrowLeft, Banknote, CreditCard, Landmark, Smartphone, Trash2, CalendarIcon, Download, PlusCircle } from 'lucide-react';
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
    DialogFooter,
  } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking, useUser, useDoc, addDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, serverTimestamp, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe, Stripe, StripeElementsOptions } from '@stripe/stripe-js';
import { STRIPE_PUBLISHABLE_KEY } from '@/lib/stripe-config';
import { CheckoutForm } from '@/components/CheckoutForm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createStripeCheckout } from '@/ai/flows/create-stripe-checkout-flow';
import { DateRange } from 'react-day-picker';

type UserInvoice = {
  id: string;
  userId: string;
  userName: string;
  dueDate: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue';
  notes?: string;
  clientSecret?: string;
  stripeReceiptUrl?: string;
};

type EndUser = {
  id: string;
  firstName: string;
  lastName: string;
  stripeCustomerId?: string;
}

type PaymentDetails = {
    amount: number | string;
    date: Date | undefined;
    note: string;
    checkNumber: string;
    venmoId: string;
}

type Vendor = {
  name: string;
  address?: {
    street1?: string;
    city?: string;
    state?: string;
    zip?: string;
  }
}

type InvoiceLineItem = {
    description: string;
    amount: number | '';
};

let stripePromise: Promise<Stripe | null>;
if (typeof window !== 'undefined') {
  stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
}

const PaymentMethodForm = ({method, children, onRecord}: {method: string, children: React.ReactNode, onRecord: () => void}) => {
  const [paymentView, setPaymentView] = useState('options');
  return (
    <div className="space-y-4">
        <DialogHeader>
          <DialogTitle>
            <Button variant="ghost" onClick={() => setPaymentView('options')} className="h-auto p-0 justify-start mb-4">
                <ArrowLeft className="h-4 w-4 mr-2"/>
                Receive a {method.toLowerCase()}
            </Button>
          </DialogTitle>
          <DialogDescription>Record a manual payment for this invoice.</DialogDescription>
        </DialogHeader>
        {children}
        <Button className="w-full" onClick={onRecord}>Record</Button>
    </div>
  )
};


export default function UserInvoicesPage() {
  const [isClient, setIsClient] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isCreateInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [isRecordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [paymentView, setPaymentView] = useState('options');
  const [selectedInvoice, setSelectedInvoice] = useState<UserInvoice | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterUserId, setFilterUserId] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<DateRange | undefined>();

  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([{ description: '', amount: '' }]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<Date | undefined>(new Date());

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

  const vendorRef = useMemoFirebase(() => vendorAdmin ? doc(firestore, 'vendors', vendorAdmin.uid) : null, [vendorAdmin, firestore]);
  const {data: vendorData} = useDoc<Vendor>(vendorRef);

  const usersQuery = useMemoFirebase(() => vendorAdmin ? query(collection(firestore, 'users'), where('vendorId', '==', vendorAdmin.uid)) : null, [vendorAdmin, firestore]);
  const { data: endUsers } = useCollection<EndUser>(usersQuery);

  const invoicesQuery = useMemoFirebase(
    () => (firestore && vendorAdmin ? collection(firestore, 'vendors', vendorAdmin.uid, 'userInvoices') : null),
    [firestore, vendorAdmin]
  );
  const { data: userInvoices, isLoading, refetch: refetchInvoices } = useCollection<UserInvoice>(invoicesQuery);

  const filteredInvoices = useMemo(() => {
    if (!userInvoices) return [];
    
    return userInvoices.filter(invoice => {
      const searchTermMatch = !searchTerm || invoice.userName.toLowerCase().includes(searchTerm.toLowerCase());
      const userMatch = filterUserId === 'all' || invoice.userId === filterUserId;
      
      let dateMatch = true;
      if (filterDateRange?.from) {
        const from = new Date(filterDateRange.from.setHours(0, 0, 0, 0));
        const to = filterDateRange.to ? new Date(filterDateRange.to.setHours(23, 59, 59, 999)) : new Date(filterDateRange.from.setHours(23, 59, 59, 999));
        const invoiceDate = new Date(invoice.dueDate);
        dateMatch = invoiceDate >= from && invoiceDate <= to;
      }

      return searchTermMatch && userMatch && dateMatch;
    });
  }, [userInvoices, searchTerm, filterUserId, filterDateRange]);


  const handlePaymentDetailChange = (field: keyof PaymentDetails, value: any) => {
    setPaymentDetails(prev => ({...prev, [field]: value}));
  };

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

  const handleCreateInvoice = async () => {
    if (!vendorAdmin || !selectedUserId || !dueDate) {
        toast({ variant: "destructive", title: "Error", description: "Please select a user and a due date." });
        return;
    }

    const totalAmount = lineItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    if (totalAmount <= 0) {
        toast({ variant: "destructive", title: "Error", description: "Invoice total must be greater than zero." });
        return;
    }
    
    const selectedUser = endUsers?.find(u => u.id === selectedUserId);
    if (!selectedUser) {
        toast({ variant: "destructive", title: "Error", description: "Selected user not found." });
        return;
    }

    setIsSubmitting(true);
    try {
        const invoiceCollectionRef = collection(firestore, 'vendors', vendorAdmin.uid, 'userInvoices');
        const notes = lineItems.map(item => `${item.description} - ${formatCurrency(Number(item.amount))}`).join('; ');
        
        // Temporarily create the invoice doc to get an ID
        const newInvoiceRef = doc(invoiceCollectionRef);
        
        const checkoutInput = {
            mode: 'payment' as const,
            customer: selectedUser.stripeCustomerId,
            line_items: lineItems.map(item => ({
                price_data: {
                    currency: 'usd',
                    product_data: { name: item.description },
                    unit_amount: Math.round(Number(item.amount) * 100),
                },
                quantity: 1,
            })),
            successUrl: `${window.location.origin}/end-user/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${window.location.origin}/vendor-admin/user-invoices`,
            metadata: {
                userId: selectedUserId,
                vendorId: vendorAdmin.uid,
                invoiceId: newInvoiceRef.id,
            }
        };

        const result = await createStripeCheckout(checkoutInput);

        if (result.url && result.id) {
            await addDocumentNonBlocking(newInvoiceRef, {
                id: newInvoiceRef.id,
                userId: selectedUserId,
                userName: `${selectedUser.firstName} ${selectedUser.lastName}`,
                vendorId: vendorAdmin.uid,
                amount: totalAmount,
                dueDate: dueDate.toISOString(),
                status: 'Pending',
                notes: notes,
                stripeCheckoutSessionId: result.id,
                stripeReceiptUrl: null, // This will be updated by webhook/verify
                createdAt: serverTimestamp(),
            });
            
            toast({ title: "Invoice Created", description: `A new invoice for ${selectedUser.firstName} has been created.` });
            setCreateInvoiceOpen(false);
            setLineItems([{ description: '', amount: '' }]);
            setSelectedUserId(null);

        } else {
            throw new Error(result.error || "Failed to create checkout session.");
        }
    } catch (e: any) {
        toast({ variant: "destructive", title: "Failed to Create Invoice", description: e.message });
    } finally {
        setIsSubmitting(false);
    }
  }


  const handleLineItemChange = (index: number, field: keyof InvoiceLineItem, value: string | number) => {
    const newLineItems = [...lineItems];
    const item = newLineItems[index];
    if (field === 'amount') {
        newLineItems[index] = { ...item, [field]: value === '' ? '' : Number(value) };
    } else {
        newLineItems[index] = { ...item, [field]: value };
    }
    setLineItems(newLineItems);
  };

  const addLineItem = () => setLineItems([...lineItems, { description: '', amount: '' }]);
  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
        setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const invoiceTotal = lineItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);


  const formatDate = (dateString: string) => {
    if (!isClient || !dateString) return '...';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    if (!isClient || typeof amount !== 'number') return '...';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };
  
  const generateInvoiceContent = (invoice: UserInvoice): string => {
    const vendorAddress = vendorData?.address ? `${vendorData.address.street1 || ''}\n${vendorData.address.city || ''}, ${vendorData.address.state || ''} ${vendorData.address.zip || ''}` : '';
    return `
INVOICE
---------------------
Invoice ID: ${invoice.id}
Date Due: ${formatDate(invoice.dueDate)}
Status: ${invoice.status}

FROM:
${vendorData?.name || 'Your Company'}
${vendorAddress}

BILLED TO:
${invoice.userName}

---------------------
DESCRIPTION
${invoice.notes || 'Parking Fee'}

AMOUNT
${formatCurrency(invoice.amount)}
---------------------

Total Due: ${formatCurrency(invoice.amount)}

Thank you for your business.
    `.trim();
  };

  const handleDownloadInvoice = (invoice: UserInvoice) => {
    const textContent = generateInvoiceContent(invoice);
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice_${invoice.userName.replace(/\s+/g, '_')}_${invoice.id.substring(0, 6)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSuccessfulPayment = () => {
    setRecordPaymentOpen(false);
    setSelectedInvoice(null);
    refetchInvoices?.(); // Refetch invoices to show the updated status
  }

  const handleExport = () => {
    if (filteredInvoices.length === 0) {
      toast({ variant: 'destructive', title: 'No Data to Export' });
      return;
    }
    const headers = ['Invoice ID', 'User Name', 'Due Date', 'Amount', 'Status', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...filteredInvoices.map(inv => [
        `"${inv.id}"`,
        `"${inv.userName}"`,
        `"${formatDate(inv.dueDate)}"`,
        inv.amount,
        inv.status,
        `"${(inv.notes || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', `user_invoices_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  
  const stripeOptions: StripeElementsOptions | undefined = selectedInvoice ? {
    mode: 'payment',
    amount: Math.round(selectedInvoice.amount * 100),
    currency: 'usd',
  } : undefined;

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">User Invoices</h1>
            <p className="text-muted-foreground">Track and manage all invoices for your users.</p>
          </div>
           <Button onClick={() => setCreateInvoiceOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>All User Invoices</CardTitle>
            <CardDescription>A list of all invoices generated for your users.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by user name..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <Select value={filterUserId} onValueChange={setFilterUserId}>
                <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Filter by user" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {endUsers?.map(user => (
                        <SelectItem key={user.id} value={user.id}>{user.firstName} {user.lastName}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
               <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full md:w-[240px] justify-start text-left font-normal",
                      !filterDateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filterDateRange?.from ? (
                      filterDateRange.to ? (
                        <>
                          {format(filterDateRange.from, "LLL dd, y")} -{" "}
                          {format(filterDateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(filterDateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Filter by date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={filterDateRange?.from}
                    selected={filterDateRange}
                    onSelect={setFilterDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
               <Button onClick={handleExport} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
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
                             <DropdownMenuItem onClick={() => handleDownloadInvoice(invoice)}>
                                <Download className="mr-2 h-4 w-4" />
                                <span>Download</span>
                            </DropdownMenuItem>
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

       <Dialog open={isCreateInvoiceOpen} onOpenChange={setCreateInvoiceOpen}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Create Manual Invoice</DialogTitle>
                    <DialogDescription>
                        This will create an invoice for a user that they can pay via a link or you can record a payment for manually.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="user-select">User</Label>
                        <Select onValueChange={setSelectedUserId} value={selectedUserId || undefined}>
                            <SelectTrigger id="user-select"><SelectValue placeholder="Select a user..." /></SelectTrigger>
                            <SelectContent>
                                {endUsers?.map(user => (
                                    <SelectItem key={user.id} value={user.id}>{user.firstName} {user.lastName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label>Due Date</Label>
                        <Popover>
                            <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus /></PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-4">
                        <Label>Line Items</Label>
                        {lineItems.map((item, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <Input
                                    placeholder="Description (e.g., Monthly Parking Fee)"
                                    value={item.description}
                                    onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                                    className="flex-grow"
                                />
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        value={item.amount}
                                        onChange={(e) => handleLineItemChange(index, 'amount', e.target.value)}
                                        className="w-32 pl-7"
                                    />
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => removeLineItem(index)} disabled={lineItems.length === 1}>
                                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={addLineItem} className="mt-2">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Line Item
                        </Button>
                    </div>
                    
                    <div className="flex justify-between items-end gap-4">
                        <div className="text-right flex-grow">
                            <Label className="text-muted-foreground">Total Amount</Label>
                            <p className="text-2xl font-bold">{formatCurrency(invoiceTotal)}</p>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setCreateInvoiceOpen(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="submit" onClick={handleCreateInvoice} disabled={isSubmitting}>
                        {isSubmitting ? 'Creating...' : 'Create & Send Invoice'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      
      {selectedInvoice && (
        <Dialog open={isRecordPaymentOpen} onOpenChange={setRecordPaymentOpen}>
            <DialogContent className="sm:max-w-4xl p-0">
                <div className="grid grid-cols-1 md:grid-cols-2">
                    <div className="p-6">
                        {paymentView === 'options' && (
                            <>
                                <DialogHeader className="mb-4"><DialogTitle>New Payment</DialogTitle><DialogDescription>Select a payment method to record the payment for this invoice.</DialogDescription></DialogHeader>
                                <div className="space-y-2">
                                    <div className="space-y-2"><Label htmlFor="payment-amount">Amount</Label><div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span><Input id="payment-amount" type="number" value={paymentDetails.amount} onChange={(e) => handlePaymentDetailChange('amount', e.target.value)} className="pl-7 text-lg" /></div></div>
                                    <Button variant="outline" className="w-full" onClick={() => setPaymentView('credit')}><CreditCard className="mr-2" /> Charge a card</Button>
                                    <Button variant="outline" className="w-full" onClick={() => setPaymentView('check')}><Landmark className="mr-2" /> Receive a check</Button>
                                    <Button variant="outline" className="w-full" onClick={() => setPaymentView('cash')}><Banknote className="mr-2" /> Receive cash</Button>
                                    <Button variant="outline" className="w-full" onClick={() => setPaymentView('venmo')}><Smartphone className="mr-2" /> Receive via Venmo</Button>
                                    <Button variant="outline" className="w-full" onClick={() => setPaymentView('zelle')}><Smartphone className="mr-2" /> Receive via Zelle</Button>
                                </div>
                            </>
                        )}
                        {paymentView === 'credit' && (
                            <div className="space-y-4">
                                <DialogHeader>
                                  <DialogTitle>
                                    <Button variant="ghost" onClick={() => setPaymentView('options')} className="h-auto p-0 justify-start mb-4">
                                        <ArrowLeft className="h-4 w-4 mr-2"/>
                                        Charge a Card
                                    </Button>
                                  </DialogTitle>
                                  <DialogDescription>Enter the user's card details to charge them directly.</DialogDescription>
                                </DialogHeader>
                                {isClient && stripeOptions && vendorAdmin?.uid && (
                                  <Elements stripe={stripePromise} options={stripeOptions}>
                                    <CheckoutForm 
                                      invoiceId={selectedInvoice.id}
                                      vendorId={vendorAdmin.uid}
                                      amount={selectedInvoice.amount}
                                      onSuccessfulPayment={handleSuccessfulPayment}
                                    />
                                  </Elements>
                                )}
                            </div>
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


