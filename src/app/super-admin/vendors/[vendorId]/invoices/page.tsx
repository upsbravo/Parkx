
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { MoreHorizontal, PlusCircle, ArrowLeft, Banknote, CreditCard, Landmark, Smartphone, Trash2, CalendarIcon, Ellipsis, Lock, ExternalLink, Send, RefreshCw, Download } from 'lucide-react';
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
import { useCollection, useDoc, useFirestore, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking, useUser, addDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, where, serverTimestamp, collectionGroup } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { createStripeCheckout } from '@/ai/flows/create-stripe-checkout-flow';
import { createStripePortalSession } from '@/ai/flows/create-stripe-portal-session-flow';
import { syncStripeInvoices } from '@/ai/flows/sync-stripe-invoices-flow';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe, Stripe, StripeElementsOptions } from '@stripe/stripe-js';
import { STRIPE_PUBLISHABLE_KEY } from '@/lib/stripe-config';
import { CheckoutForm } from '@/components/CheckoutForm';


type VendorInvoice = {
  id: string;
  vendorId: string;
  vendorName: string;
  dueDate: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue';
  notes?: string;
  stripeInvoicePdfUrl?: string;
};

type Vendor = {
    id: string;
    name: string;
    spotLimit: number;
    status: string;
    stripeCustomerId?: string;
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

let stripePromise: Promise<Stripe | null>;
if (typeof window !== 'undefined') {
  stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
}

export default function VendorInvoicesPage() {
  const params = useParams();
  const vendorId = params.vendorId as string;
  const { user: superAdmin } = useUser();

  const [isClient, setIsClient] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isCreateInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [isRecordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [paymentView, setPaymentView] = useState('options');
  const [selectedInvoice, setSelectedInvoice] = useState<VendorInvoice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([{ description: '', amount: '' }]);
  
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
  }, [selectedInvoice, isRecordPaymentOpen]);


  const handlePaymentDetailChange = useCallback(<K extends keyof PaymentDetails>(field: K, value: PaymentDetails[K]) => {
      setPaymentDetails(prev => ({...prev, [field]: value}));
  }, []);


  const firestore = useFirestore();

  const vendorRef = useMemoFirebase(() => (firestore && vendorId ? doc(firestore, 'vendors', vendorId) : null), [firestore, vendorId]);
  const { data: vendor, isLoading: isVendorLoading, refetch: refetchVendor } = useDoc<Vendor>(vendorRef);

  const invoicesQuery = useMemoFirebase(
    () => (firestore && vendorId ? query(collection(firestore, 'vendors', vendorId, 'vendorInvoices')) : null),
    [firestore, vendorId]
  );
  const { data: vendorInvoices, isLoading: isInvoicesLoading, refetch: refetchInvoices } = useCollection<VendorInvoice>(invoicesQuery);

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

    const invoiceRef = doc(firestore, 'vendors', vendorId, 'vendorInvoices', selectedInvoice.id);
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
    const invoiceRef = doc(firestore, 'vendors', vendorId, 'vendorInvoices', invoice.id);
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
    const invoiceRef = doc(firestore, 'vendors', vendorId, 'vendorInvoices', selectedInvoice.id);
    deleteDocumentNonBlocking(invoiceRef);
    toast({
      variant: 'destructive',
      title: 'Invoice Voided',
      description: `Invoice for ${selectedInvoice.vendorName} has been deleted.`,
    });
    setIsAlertOpen(false);
    setSelectedInvoice(null);
  };

  const handleCreateInvoice = async () => {
    if (!vendor || !superAdmin) return;

    const totalAmount = lineItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    if (totalAmount <= 0) {
        toast({ variant: "destructive", title: "Error", description: "Invoice total must be greater than zero." });
        return;
    }

    setIsSubmitting(true);
    try {
        const checkoutInput = {
            mode: 'payment' as const,
            uid: superAdmin.uid,
            customer: vendor.stripeCustomerId,
            line_items: lineItems.map(item => ({
                price_data: {
                    currency: 'usd',
                    product_data: { name: item.description },
                    unit_amount: Math.round(Number(item.amount) * 100),
                },
                quantity: 1,
            })),
            successUrl: `${window.location.origin}/vendor-admin/invoices?payment=success`,
            cancelUrl: window.location.href,
        };

        const result = await createStripeCheckout(checkoutInput);

        if (result.url && result.id) {
            const invoiceCollectionRef = collection(firestore, 'vendors', vendorId, 'vendorInvoices');
            const notes = lineItems.map(item => `${item.description} - ${formatCurrency(Number(item.amount))}`).join('; ');
            
            await addDocumentNonBlocking(invoiceCollectionRef, {
                vendorId: vendorId,
                vendorName: vendor.name,
                amount: totalAmount,
                dueDate: new Date().toISOString(),
                status: 'Pending',
                notes: notes,
                stripeCheckoutSessionId: result.id,
                stripeInvoicePdfUrl: result.url, // Store checkout URL to be used as payment link
                createdAt: serverTimestamp(),
            });

            toast({
                title: "Invoice Created",
                description: "A new pending invoice has been created and is now visible to the vendor.",
            });
             setCreateInvoiceOpen(false);
             setLineItems([{ description: '', amount: '' }]);
        } else {
            throw new Error(result.error || "Failed to get checkout URL.");
        }

    } catch (e: any) {
        toast({
            variant: "destructive",
            title: "Failed to Create Invoice",
            description: e.message || "Failed to create checkout session. Check server logs.",
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  const handleSendPaymentLink = async (invoice: VendorInvoice) => {
    if (!vendor || !superAdmin) return;

    setIsSubmitting(true);
    try {
        const checkoutInput = {
            mode: 'payment' as const,
            uid: superAdmin.uid,
            customer: vendor.stripeCustomerId,
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: { name: invoice.notes || `Invoice #${invoice.id.substring(0,6)}` },
                    unit_amount: Math.round(invoice.amount * 100),
                },
                quantity: 1,
            }],
            successUrl: window.location.href,
            cancelUrl: window.location.href,
        };

        const result = await createStripeCheckout(checkoutInput);

        if (result.url) {
            toast({
                title: "Payment Link Generated",
                description: "Share this secure link with the vendor to collect payment.",
                duration: 10000,
                action: (
                    <div className='flex gap-2'>
                        <Button onClick={() => navigator.clipboard.writeText(result.url || '')}>Copy Link</Button>
                        <Button variant="secondary" onClick={() => window.open(result.url, '_blank')}>Open</Button>
                    </div>
                )
            });
        } else {
            throw new Error(result.error || "Failed to get checkout URL.");
        }

    } catch (e: any) {
        toast({
            variant: "destructive",
            title: "Failed to Create Payment Link",
            description: e.message || "Could not create link. Check server logs.",
        });
    } finally {
        setIsSubmitting(false);
    }
  };

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

    const generateInvoiceContent = (invoice: VendorInvoice): string => {
    return `
INVOICE FROM PARKX
---------------------
Invoice ID: ${invoice.id}
Date Due: ${formatDate(invoice.dueDate)}
Status: ${invoice.status}

BILLED TO:
${invoice.vendorName}

---------------------
DESCRIPTION
${invoice.notes || 'Subscription Fee'}

AMOUNT
${formatCurrency(invoice.amount)}
---------------------

Total Due: ${formatCurrency(invoice.amount)}

Thank you for your business.
    `.trim();
  };
  
  const handleDownloadInvoice = (invoice: VendorInvoice) => {
    if (invoice.stripeInvoicePdfUrl) {
      window.open(invoice.stripeInvoicePdfUrl, '_blank');
      return;
    }

    const textContent = generateInvoiceContent(invoice);
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice_${invoice.vendorName.replace(/\s+/g, '_')}_${invoice.id.substring(0, 6)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleManageBilling = async () => {
    if (isSubmitting || !vendor || !vendor.stripeCustomerId) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: vendor?.stripeCustomerId ? 'An operation is already in progress.' : 'This vendor does not have a Stripe Customer ID.'
        });
        return;
    }

    setIsSubmitting(true);
    toast({ title: 'Generating Portal Link...' });

    try {
        const result = await createStripePortalSession({
            customerId: vendor.stripeCustomerId,
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
    // No need to set isSubmitting to false if redirect is successful
  };

   const handleSyncInvoices = async () => {
    if (!vendor?.stripeCustomerId || !vendorId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Stripe Customer ID not found.' });
        return;
    }
    setIsSyncing(true);
    try {
        const result = await syncStripeInvoices({ 
            stripeCustomerId: vendor.stripeCustomerId,
            vendorId: vendorId 
        });
        if (result.success) {
            toast({
                title: 'Sync Complete',
                description: `${result.syncedCount} new invoice(s) have been synced from Stripe.`,
            });
            if (refetchInvoices) {
                refetchInvoices();
            }
        } else {
            throw new Error(result.error || 'Unknown sync error.');
        }
    } catch (e: any) {
        toast({
            variant: 'destructive',
            title: 'Sync Failed',
            description: e.message,
        });
    } finally {
        setIsSyncing(false);
    }
  };
  
  const isLoading = isVendorLoading || isInvoicesLoading;

  const getAgingStatus = (invoice: VendorInvoice) => {
    if (invoice.status === 'Paid' || !invoice.dueDate) {
      return null;
    }
    const days = differenceInDays(new Date(), new Date(invoice.dueDate));
    if (days > 0) {
      return <span className="text-destructive">{days} days overdue</span>;
    }
    if (days === 0) {
      return 'Due today';
    }
    return `Due in ${-days} days`;
  };

    const handleSuccessfulPayment = () => {
        setRecordPaymentOpen(false);
        setSelectedInvoice(null);
        refetchInvoices?.();
        refetchVendor?.();
    }

    const stripeOptions: StripeElementsOptions | undefined = selectedInvoice ? {
        mode: 'payment',
        amount: Math.round(selectedInvoice.amount * 100),
        currency: 'usd',
    } : undefined;
  
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
                Use the button below to allow the vendor to manage their billing information through Stripe.
            </CardDescription>
            </CardHeader>
            <CardContent>
            <Button onClick={handleManageBilling} disabled={isSubmitting || isLoading}>
                {isSubmitting ? 'Redirecting...' : 'Manage Billing via Stripe'}
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
            <div className='flex gap-2'>
              <Button variant="outline" onClick={handleSyncInvoices} disabled={isSyncing || isLoading}>
                  <RefreshCw className={cn("mr-2 h-4 w-4", isSyncing && "animate-spin")} />
                  {isSyncing ? 'Syncing...' : 'Sync with Stripe'}
              </Button>
              <Button onClick={() => setCreateInvoiceOpen(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Manual Payment
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice ID</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Aging</TableHead>
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
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
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
                      <TableCell className="text-sm">{getAgingStatus(invoice)}</TableCell>
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
                             <DropdownMenuItem onClick={() => handleDownloadInvoice(invoice)}>
                                <Download className="mr-2 h-4 w-4" />
                                <span>Download PDF</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSendPaymentLink(invoice)} disabled={isSubmitting}>
                                <Send className="mr-2 h-4 w-4" />
                                Send Payment Link
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
                      colSpan={7}
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
                    <DialogTitle>Create One-Time Payment for {vendor?.name}</DialogTitle>
                    <DialogDescription>
                        This will generate a secure Stripe payment link for a one-time charge. An invoice will be created and appear on the vendor's dashboard.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="space-y-4">
                        <Label>Line Items</Label>
                        {lineItems.map((item, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <Input
                                    placeholder="Description (e.g., One-time fee)"
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
                        {isSubmitting ? 'Creating Invoice...' : 'Create Invoice'}
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
                                    <DialogDescription>Select a payment method to record the payment for this invoice.</DialogDescription>
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
                                    <Button variant="outline" className="w-full" onClick={() => setPaymentView('credit')}><CreditCard className="mr-2" /> Charge a card manually</Button>
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
                                <DialogDescription>Enter the vendor's card details to charge them directly.</DialogDescription>
                                </DialogHeader>
                                {isClient && stripeOptions && (
                                <Elements stripe={stripePromise} options={stripeOptions}>
                                    <CheckoutForm 
                                    invoiceId={selectedInvoice.id}
                                    vendorId={vendorId}
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

    

    
