
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
import { MoreHorizontal, PlusCircle, ArrowLeft } from 'lucide-react';
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
import { useCollection, useDoc, useFirestore, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

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

export default function VendorInvoicesPage() {
  const params = useParams();
  const vendorId = params.vendorId as string;

  const [isClient, setIsClient] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isCreateInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<VendorInvoice | null>(null);
  const { toast } = useToast();

  const [newInvoiceAmount, setNewInvoiceAmount] = useState(0);
  const [newInvoiceNotes, setNewInvoiceNotes] = useState('');

  useEffect(() => {
    setIsClient(true);
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

  const handleMarkAsPaid = (invoice: VendorInvoice) => {
    if (invoice.status === 'Paid') return;
    const invoiceRef = doc(firestore, 'vendorInvoices', invoice.id);
    updateDocumentNonBlocking(invoiceRef, { status: 'Paid' });
    toast({
      title: 'Invoice Updated',
      description: `Invoice for ${invoice.vendorName} marked as Paid.`,
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
    const invoicesRef = collection(firestore, 'vendorInvoices');
    addDocumentNonBlocking(invoicesRef, {
      vendorId: vendor.id,
      vendorName: vendor.name,
      amount: newInvoiceAmount,
      dueDate: new Date().toISOString(),
      status: 'Pending',
      notes: newInvoiceNotes,
    });
    toast({
      title: 'Invoice Created',
      description: `A new invoice for $${newInvoiceAmount} has been created for ${vendor.name}.`,
    });
    setCreateInvoiceOpen(false);
    setNewInvoiceAmount(0);
    setNewInvoiceNotes('');
  }

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
                    Invoices for {isVendorLoading ? <Skeleton className="h-8 w-48 inline-block" /> : vendor?.name}
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
                            <DropdownMenuItem onClick={() => handleMarkAsPaid(invoice)}>Mark as Paid</DropdownMenuItem>
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

      <Dialog open={isCreateInvoiceOpen} onOpenChange={setCreateInvoiceOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
            <DialogTitle>Create Manual Invoice for {vendor?.name}</DialogTitle>
            <DialogDescription>
                Create a one-time invoice for additional charges or fees.
            </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="invoice-amount">Amount</Label>
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                        <Input
                            id="invoice-amount"
                            type="number"
                            value={newInvoiceAmount}
                            onChange={(e) => setNewInvoiceAmount(Number(e.target.value))}
                            className="pl-7"
                            placeholder="0.00"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="invoice-notes">Notes / Reason</Label>
                    <Textarea
                        id="invoice-notes"
                        value={newInvoiceNotes}
                        onChange={(e) => setNewInvoiceNotes(e.target.value)}
                        placeholder="e.g., One-time cleaning fee"
                    />
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

