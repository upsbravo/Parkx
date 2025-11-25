
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
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
import { MoreHorizontal, PlusCircle, ArrowLeft, Banknote, CreditCard, Landmark, Smartphone, Trash2, CalendarIcon, Ellipsis, Lock } from 'lucide-react';
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
}

type InvoiceLineItem = {
    description: string;
    amount: number | '';
};

export default function VendorInvoicesPage() {
  const params = useParams();
  const vendorId = params.vendorId as string;

  const [isClient, setIsClient] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isCreateInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [isRecordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [paymentView, setPaymentView] = useState('options');
  const [selectedInvoice, setSelectedInvoice] = useState<VendorInvoice | null>(null);
  const { toast } = useToast();

  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([{ description: '', amount: '' }]);
  const [dueDate, setDueDate] = useState<Date | undefined>(new Date());
  
  const [paymentAmount, setPaymentAmount] = useState<number | string>('');

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  useEffect(() => {
    if (selectedInvoice) {
      setPaymentAmount(selectedInvoice.amount);
    }
  }, [selectedInvoice]);

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
  
  const handleConfirmPayment = (paymentMethod: string) => {
    if (!selectedInvoice) return;
    const amount = Number(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a valid payment amount.' });
      return;
    }

    const invoiceRef = doc(firestore, 'vendorInvoices', selectedInvoice.id);
    // In a real app, you'd handle partial payments, but for now we'll mark as paid.
    const newStatus = 'Paid';
    const updatedNotes = `Paid ${formatCurrency(amount)} via ${paymentMethod}. ${selectedInvoice.notes || ''}`;

    updateDocumentNonBlocking(invoiceRef, { status: newStatus, notes: updatedNotes });
    
    toast({
      title: 'Payment Recorded',
      description: `Invoice for ${selectedInvoice.vendorName} marked as Paid.`,
    });

    setRecordPaymentOpen(false);
    setSelectedInvoice(null);
    setPaymentAmount('');
  }

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
  
  const isLoading = isVendorLoading || isInvoicesLoading;
  
  const cardFormIcons = (
    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center gap-1 pr-3">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 38 24" fill="none" className="h-4 w-6"><rect width="38" height="24" rx="4" fill="#1a1a1a"></rect><circle cx="10" cy="12" r="5" fill="#eb001b"></circle><circle cx="28" cy="12" r="5" fill="#f79e1b"></circle><path d="M23 12c0-2.761 2.239-5 5-5s5 2.239 5 5-2.239 5-5 5-5-2.239-5-5z" fill="#ff5f00"></path></svg>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M18.84 4.42a1.2 1.2 0 0 0-1.68 0L9.32 12l-2.4-2.4a1.2 1.2 0 0 0-1.68 0L.42 14.44a1.2 1.2 0 0 0 0 1.68l3.62 3.62a1.2 1.2 0 0 0 1.68 0L13.56 12l2.4 2.4a1.2 1.2 0 0 0 1.68 0l4.82-4.82a1.2 1.2 0 0 0 0-1.68Z" /><path d="M12 11.5 2.22 1.72" /><path d="m21.8 2.2-9.8 9.8" /></svg>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg>
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
                             {invoice.status !== 'Paid' && <DropdownMenuItem onClick={() => handleRecordPaymentClick(invoice)}>Record Payment</DropdownMenuItem>}
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
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle>
                    {paymentView === 'options' ? (
                        'New Payment'
                    ) : (
                        <Button variant="ghost" onClick={() => setPaymentView('options')} className="h-auto p-0 justify-start">
                            <ArrowLeft className="h-4 w-4 mr-2"/>
                            Charge a card manually
                        </Button>
                    )}
                    </DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2">
                    <div className="p-6 space-y-4">
                        {paymentView === 'options' ? (
                             <>
                                <div className="space-y-2">
                                    <Label htmlFor="payment-amount">Amount</Label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                                        <Input
                                            id="payment-amount"
                                            type="number"
                                            value={paymentAmount}
                                            onChange={(e) => setPaymentAmount(e.target.value)}
                                            className="pl-7 text-lg"
                                        />
                                    </div>
                                </div>
                                <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => setPaymentView('manualCard')}>
                                    <CreditCard className="mr-2" /> Charge a card manually
                                </Button>
                                <Button variant="outline" className="w-full" onClick={() => handleConfirmPayment('Recorded Card Transaction')}>
                                    <CreditCard className="mr-2" /> Record a card transaction
                                </Button>
                                <Button variant="outline" className="w-full" onClick={() => handleConfirmPayment('Check')}>
                                    <Landmark className="mr-2" /> Receive a check
                                </Button>
                                <Button variant="outline" className="w-full" onClick={() => handleConfirmPayment('Cash')}>
                                    <Banknote className="mr-2" /> Receive cash
                                </Button>
                                <Button variant="ghost" className="w-full text-muted-foreground">
                                    <Ellipsis className="mr-2" /> More Options
                                </Button>
                            </>
                        ) : (
                            <div className="space-y-4">
                                 <div className="space-y-1">
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                                        <Input
                                            id="payment-amount-charge"
                                            type="number"
                                            value={paymentAmount}
                                            onChange={(e) => setPaymentAmount(e.target.value)}
                                            className="pl-7 text-2xl font-bold h-12"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="card-number">Card Number</Label>
                                    <div className="relative">
                                        <Input id="card-number" placeholder="1234 1234 1234 1234" />
                                        {cardFormIcons}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="expiration-date">Expiration Date</Label>
                                        <Input id="expiration-date" placeholder="MM / YY" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="security-code">Security Code</Label>
                                         <div className="relative">
                                            <Input id="security-code" placeholder="CVC" />
                                            <CreditCard className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        </div>
                                    </div>
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="country">Country</Label>
                                    <Select defaultValue="US">
                                        <SelectTrigger id="country">
                                            <SelectValue placeholder="Select a country" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="US">United States</SelectItem>
                                            <SelectItem value="CA">Canada</SelectItem>
                                            <SelectItem value="MX">Mexico</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="zip-code">ZIP Code</Label>
                                    <Input id="zip-code" placeholder="12345" />
                                </div>
                                <Button className="w-full" onClick={() => handleConfirmPayment(`Manual Card Charge: ${formatCurrency(Number(paymentAmount))}`)}>
                                    Charge {formatCurrency(Number(paymentAmount))}
                                </Button>
                                <p className="text-xs text-muted-foreground text-center flex items-center justify-center">
                                    <Lock className="h-3 w-3 mr-1" />
                                    Secure Payment. PCI Service Provider Level 1 Certified.
                                </p>
                            </div>
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
                                <span>- {formatCurrency(Number(paymentAmount))}</span>
                            </div>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold text-lg text-green-600">
                                <span>Remaining</span>
                                <span>{formatCurrency(selectedInvoice.amount - Number(paymentAmount))}</span>
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
