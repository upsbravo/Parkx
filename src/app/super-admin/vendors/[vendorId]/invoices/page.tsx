
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
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
import { MoreHorizontal, PlusCircle, ArrowLeft, Banknote, CreditCard, Landmark, Smartphone, Trash2, CalendarIcon, Ellipsis, Lock, ExternalLink, Send } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCollection, useDoc, useFirestore, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { createStripeCheckout } from '@/ai/flows/create-stripe-checkout-flow';


type VendorInvoice = {
  id: string;
  vendorId: string;
  vendorName: string;
  dueDate: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue';
  notes?: string;
};

type Vendor = {
    id: string;
    name: string;
    spotLimit: number;
};

type InvoiceLineItem = {
    description: string;
    amount: number | '';
};

type PaymentDetails = {
    amount: number | string;
    date: Date | undefined;
    note: string;
    checkNumber: string;
    venmoId: string;
}

export default function VendorInvoicesPage() {
  const params = useParams();
  const vendorId = params.vendorId as string;

  const [isClient, setIsClient] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isCreateInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [isRecordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [paymentView, setPaymentView] = useState('options');
  const [selectedInvoice, setSelectedInvoice] = useState<VendorInvoice | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const { toast } = useToast();

  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([{ description: '', amount: '' }]);
  const [dueDate, setDueDate] = useState<Date | undefined>(new Date());
  
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
      amount: '',
      date: new Date(),
      note: '',
      checkNumber: '',
      venmoId: '',
  });


  useEffect(() => {
    setIsClient(true);
  }, []);
  
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
  // This should only run when the selected invoice changes, not every time the dialog opens.
  }, [selectedInvoice, isRecordPaymentOpen]);


  const handlePaymentDetailChange = useCallback(<K extends keyof PaymentDetails>(field: K, value: PaymentDetails[K]) => {
      setPaymentDetails(prev => ({...prev, [field]: value}));
  }, []);


  const firestore = useFirestore();

  const vendorRef = useMemoFirebase(() => (firestore && vendorId ? doc(firestore, 'vendors', vendorId) : null), [firestore, vendorId]);
  const { data: vendor, isLoading: isVendorLoading } = useDoc<Vendor>(vendorRef);

  const invoicesQuery = useMemoFirebase(
    () => (firestore && vendorId ? query(collection(firestore, 'vendorInvoices'), where('vendorId', '==', vendorId)) : null),
    [firestore, vendorId]
  );
  const { data: vendorInvoices, isLoading: isInvoicesLoading } = useCollection<VendorInvoice>(invoicesQuery);

  const statusVariant = {
    Paid: 'default',
    Pending: 'secondary',
    Overdue: 'destructive',
  } as const;

  const handleRecordPaymentClick = (invoice: VendorInvoice) => {
    setSelectedInvoice(invoice);
    setPaymentView('options');
    setRecordPaymentOpen(true);
  };
  
  const handleConfirmPayment = (method: string) => {
    if (!selectedInvoice) return;
    const amount = Number(paymentDetails.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a valid payment amount.' });
      return;
    }
    
    let details = '';
    switch (method) {
        case 'Check':
            details = `Check #${paymentDetails.checkNumber}.`;
            break;
        case 'Cash':
            details = `Cash payment.`;
            break;
        case 'Venmo':
            details = `Venmo ID: ${paymentDetails.venmoId}.`;
            break;
        case 'Zelle':
            details = 'Zelle payment.';
            break;
        default:
            details = `${method}.`;
    }

    const fullNote = `Paid ${formatCurrency(amount)} via ${method} on ${format(paymentDetails.date || new Date(), 'PPP')}. ${details} Note: "${paymentDetails.note}"`;

    const invoiceRef = doc(firestore, 'vendorInvoices', selectedInvoice.id);
    const newStatus = 'Paid';
    const updatedNotes = `${fullNote} | ${selectedInvoice.notes || ''}`.trim();

    updateDocumentNonBlocking(invoiceRef, { status: newStatus, notes: updatedNotes });
    
    toast({
      title: 'Payment Recorded',
      description: `Payment for ${selectedInvoice.vendorName} has been recorded.`,
    });

    setRecordPaymentOpen(false);
    setSelectedInvoice(null);
  }

  const handleMarkAsUnpaid = (invoice: VendorInvoice) => {
    if (!invoice || invoice.status !== 'Paid') return;
    const invoiceRef = doc(firestore, 'vendorInvoices', invoice.id);
    updateDocumentNonBlocking(invoiceRef, { status: 'Pending' });
    toast({
      title: 'Invoice Updated',
      description: `Invoice for ${invoice.vendorName} marked as Pending.`,
    });
  };

  const handleVoidClick = (invoice: VendorInvoice) => {
    setSelectedInvoice(invoice);
    setIsAlertOpen(true);
  };

  const handleVoidConfirm = () => {
    if (!selectedInvoice) return;
    const invoiceRef = doc(firestore, 'vendorInvoices', selectedInvoice.id);
    deleteDocumentNonBlocking(invoiceRef);
    toast({
      variant: 'destructive',
      title: 'Invoice Voided',
      description: `Invoice for ${selectedInvoice.vendorName} has been deleted.`,
    });
    setIsAlertOpen(false);
    setSelectedInvoice(null);
  };

  const handleCreateInvoice = () => {
    if (!vendor) return;

    const totalAmount = lineItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    if (totalAmount <= 0) {
        toast({ variant: "destructive", title: "Error", description: "Invoice total must be greater than zero." });
        return;
    }
    if (!dueDate) {
        toast({ variant: "destructive", title: "Error", description: "Please select a due date." });
        return;
    }

    const notes = lineItems.map(item => `${item.description} ($${item.amount})`).join('; ');

    const invoicesRef = collection(firestore, 'vendorInvoices');
    addDocumentNonBlocking(invoicesRef, {
      vendorId: vendor.id,
      vendorName: vendor.name,
      amount: totalAmount,
      dueDate: dueDate.toISOString(),
      status: 'Pending',
      notes: notes,
    });
    toast({
      title: 'Invoice Created',
      description: `A new invoice for ${formatCurrency(totalAmount)} has been created for ${vendor.name}.`,
    });
    setCreateInvoiceOpen(false);
    setLineItems([{ description: '', amount: '' }]);
    setDueDate(new Date());
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleSubscribe = async () => {
    if (!vendorId || !vendor) {
        toast({ variant: 'destructive', title: 'Error', description: 'Vendor not found.' });
        return;
    }
    
    const basePriceId = process.env.NEXT_PUBLIC_STRIPE_BASE_PRICE_ID;
    const addonPriceId = process.env.NEXT_PUBLIC_STRIPE_ADDON_PRICE_ID;

    if (!basePriceId || !addonPriceId) {
        toast({ variant: 'destructive', title: 'Configuration Error', description: 'Stripe Price IDs are not configured. Please add them to your .env.local file.' });
        return;
    }

    setIsSubscribing(true);
    toast({
      title: 'Redirecting to Stripe...',
      description: 'Please wait while we create a secure checkout session.',
    });

    try {
        const lineItems = [{ price: basePriceId, quantity: 1 }];
        const extraSpots = Math.max(0, vendor.spotLimit - 20);
        if (extraSpots > 0) {
            lineItems.push({ price: addonPriceId, quantity: extraSpots });
        }
      
      const result = await createStripeCheckout({
        line_items: lineItems, 
        successUrl: window.location.href,
        cancelUrl: window.location.href,
        uid: vendorId, // Pass the vendor's ID as the user ID for the checkout
      });

      if (result.url) {
        window.location.assign(result.url);
      } else {
        // Use a toast to display the error gracefully instead of throwing
        toast({
            variant: "destructive",
            title: "Checkout Error",
            description: result.error || "Could not retrieve the checkout URL. This may be due to a local environment configuration."
        });
      }
    } catch (error: any) {
      console.error('Stripe checkout error:', error);
      toast({
        variant: 'destructive',
        title: 'Subscription Failed',
        description: error.message || 'Could not redirect to Stripe. Please try again.',
      });
    } finally {
        setIsSubscribing(false);
    }
  };
  
  const isLoading = isVendorLoading || isInvoicesLoading;
  
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
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
                <Link href="/super-admin/vendors">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
            </Button>
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    Billings for {isVendorLoading ? <Skeleton className="h-8 w-48 inline-block" /> : vendor?.name}
                </h1>
                <p className="text-muted-foreground">
                    Track and manage this vendor's subscription invoices.
                </p>
            </div>
        </div>

        <Card>
            <CardHeader>
            <CardTitle>Manage Subscription</CardTitle>
            <CardDescription>
                Use the button below to subscribe this vendor or manage their billing information through Stripe.
            </CardDescription>
            </CardHeader>
            <CardContent>
            <Button onClick={handleSubscribe} disabled={isSubscribing || isLoading}>
                {isSubscribing ? 'Redirecting...' : 'Manage Billing via Stripe'}
                <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
            </CardContent>
        </Card>


        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Invoice History</CardTitle>
                <CardDescription>
                A list of all invoices generated for this vendor.
                </CardDescription>
            </div>
            <Button onClick={() => setCreateInvoiceOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Manual Invoice
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice ID</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : vendorInvoices && vendorInvoices.length > 0 ? (
                  vendorInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium truncate max-w-[100px] text-xs font-mono">{invoice.id}</TableCell>
                      <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                      <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[invoice.status]}>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[250px] truncate text-muted-foreground">
                        {invoice.notes}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              aria-haspopup="true"
                              size="icon"
                              variant="ghost"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => {
                                toast({
                                    title: "Email Sent",
                                    description: `An invoice reminder has been sent to ${invoice.vendorName}.`
                                })
                            }}>
                                <Send className="mr-2 h-4 w-4" />
                                Send Reminder
                            </DropdownMenuItem>
                             {invoice.status !== 'Paid' ? (
                                <DropdownMenuItem onClick={() => handleRecordPaymentClick(invoice)}>Record Payment</DropdownMenuItem>
                             ) : (
                                <DropdownMenuItem onClick={() => handleMarkAsUnpaid(invoice)}>Mark as Unpaid</DropdownMenuItem>
                             )}
                            <DropdownMenuItem
                              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                              onClick={() => handleVoidClick(invoice)}
                            >
                              Void Invoice
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No invoices found for this vendor.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Create Invoice Dialog */}
        <Dialog open={isCreateInvoiceOpen} onOpenChange={setCreateInvoiceOpen}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Create Manual Invoice for {vendor?.name}</DialogTitle>
                    <DialogDescription>
                        Add line items for one-time charges, fees, or credits.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="space-y-4">
                        <Label>Line Items</Label>
                        {lineItems.map((item, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <Input
                                    placeholder="Description (e.g., Monthly Subscription)"
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
                        <div className="space-y-2">
                            <Label htmlFor="due-date">Due Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                    "w-[240px] justify-start text-left font-normal",
                                    !dueDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={dueDate}
                                    onSelect={setDueDate}
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="text-right">
                            <Label className="text-muted-foreground">Total Amount</Label>
                            <p className="text-2xl font-bold">{formatCurrency(invoiceTotal)}</p>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setCreateInvoiceOpen(false)}>
                        Cancel
                    </Button>
                    <Button type="submit" onClick={handleCreateInvoice}>
                        Create Invoice
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      
      {/* Record Payment Dialog */}
      {selectedInvoice && (
        <Dialog open={isRecordPaymentOpen} onOpenChange={setRecordPaymentOpen}>
            <DialogContent className="sm:max-w-4xl p-0">
                <div className="grid grid-cols-1 md:grid-cols-2">
                    <div className="p-6">
                        {paymentView === 'options' && (
                            <>
                                <DialogHeader className="mb-4">
                                    <DialogTitle>New Payment</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="payment-amount">Amount</Label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                                            <Input
                                                id="payment-amount"
                                                type="number"
                                                value={paymentDetails.amount}
                                                onChange={(e) => handlePaymentDetailChange('amount', e.target.value)}
                                                className="pl-7 text-lg"
                                            />
                                        </div>
                                    </div>
                                    <Button variant="outline" className="w-full" onClick={() => setPaymentView('credit')}>
                                        <CreditCard className="mr-2" /> Charge a card manually
                                    </Button>
                                    <Button variant="outline" className="w-full" onClick={() => setPaymentView('check')}>
                                        <Landmark className="mr-2" /> Receive a check
                                    </Button>
                                    <Button variant="outline" className="w-full" onClick={() => setPaymentView('cash')}>
                                        <Banknote className="mr-2" /> Receive cash
                                    </Button>
                                    <Button variant="outline" className="w-full" onClick={() => setPaymentView('venmo')}>
                                        <Smartphone className="mr-2" /> Receive via Venmo
                                    </Button>
                                     <Button variant="outline" className="w-full" onClick={() => setPaymentView('zelle')}>
                                        <Smartphone className="mr-2" /> Receive via Zelle
                                    </Button>
                                </div>
                            </>
                        )}

                        {paymentView === 'credit' && (
                             <PaymentMethodForm method="Card" onRecord={() => handleConfirmPayment('Credit Card')}>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="payment-amount-credit">Amount</Label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                                            <Input id="payment-amount-credit" type="number" value={paymentDetails.amount} onChange={(e) => handlePaymentDetailChange('amount', e.target.value)} className="pl-7" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="card-number">Card Information</Label>
                                        <div className="relative">
                                            <Input id="card-number" placeholder="Card number" className="pr-12" />
                                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 gap-1">
                                                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                                            </div>
                                        </div>
                                    </div>
                                     <div className="grid grid-cols-2 gap-4">
                                        <Input placeholder="MM/YY" />
                                        <Input placeholder="CVC" />
                                    </div>
                                     <div className="grid grid-cols-2 gap-4">
                                        <Input placeholder="Country" />
                                        <Input placeholder="ZIP" />
                                    </div>
                                </div>
                             </PaymentMethodForm>
                        )}

                        {paymentView === 'check' && (
                             <PaymentMethodForm method="Check" onRecord={() => handleConfirmPayment('Check')}>
                                <div className="space-y-4">
                                     <div className="space-y-2">
                                        <Label htmlFor="payment-amount-check">Amount</Label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                                            <Input id="payment-amount-check" type="number" value={paymentDetails.amount} onChange={(e) => handlePaymentDetailChange('amount', e.target.value)} className="pl-7" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Date</Label>
                                        <Popover>
                                            <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !paymentDetails.date && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{paymentDetails.date ? format(paymentDetails.date, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger>
                                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={paymentDetails.date} onSelect={(d) => handlePaymentDetailChange('date', d)} initialFocus /></PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="check-number">Check #</Label>
                                        <Input id="check-number" value={paymentDetails.checkNumber} onChange={(e) => handlePaymentDetailChange('checkNumber', e.target.value)} placeholder="1234" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="check-note">Note</Label>
                                        <Textarea id="check-note" value={paymentDetails.note} onChange={(e) => handlePaymentDetailChange('note', e.target.value)} placeholder="e.g. Payment for entire order" />
                                    </div>
                                </div>
                            </PaymentMethodForm>
                        )}
                        
                        {paymentView === 'cash' && (
                            <PaymentMethodForm method="Cash" onRecord={() => handleConfirmPayment('Cash')}>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="payment-amount-cash">Amount</Label>
                                        <div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span><Input id="payment-amount-cash" type="number" value={paymentDetails.amount} onChange={(e) => handlePaymentDetailChange('amount', e.target.value)} className="pl-7" /></div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Date</Label>
                                        <Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !paymentDetails.date && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{paymentDetails.date ? format(paymentDetails.date, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={paymentDetails.date} onSelect={(d) => handlePaymentDetailChange('date', d)} initialFocus /></PopoverContent></Popover>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="cash-note">Note</Label>
                                        <Textarea id="cash-note" value={paymentDetails.note} onChange={(e) => handlePaymentDetailChange('note', e.target.value)} placeholder="Add a note..." />
                                    </div>
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
                            <div className="flex justify-between">
                                <span>Total Due</span>
                                <span>{formatCurrency(selectedInvoice.amount)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Paid to Date</span>
                                <span>$0.00</span>
                            </div>
                             <div className="flex justify-between font-semibold">
                                <span>Amount</span>
                                <span>- {formatCurrency(Number(paymentDetails.amount))}</span>
                            </div>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold text-lg text-green-600">
                                <span>Remaining</span>
                                <span>{formatCurrency(selectedInvoice.amount - Number(paymentDetails.amount))}</span>
                        </div>
                        <Separator />
                        <div>
                             <h4 className="font-semibold text-muted-foreground text-sm mb-2">PAYMENTS</h4>
                             <p className="text-sm text-muted-foreground">No transactions yet</p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
      )}


      {/* Void Invoice Alert */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              invoice for {selectedInvoice?.vendorName}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVoidConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
