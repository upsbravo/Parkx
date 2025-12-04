
'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { MoreHorizontal, Search, Download, Send } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking, useUser } from '@/firebase';
import { collection, doc, query, serverTimestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { differenceInDays } from 'date-fns';
import { Input } from '@/components/ui/input';


type VendorInvoice = {
  id: string;
  vendorName: string;
  vendorId: string;
  dueDate: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue';
  notes?: string;
  stripeInvoicePdfUrl?: string;
  stripeReceiptUrl?: string;
};

export default function AllInvoicesPage() {
  const [isClient, setIsClient] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<VendorInvoice | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const { user: superAdmin } = useUser();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const firestore = useFirestore();
  const invoicesQuery = useMemoFirebase(
    () => (firestore && superAdmin ? query(collection(firestore, 'vendorInvoices')) : null),
    [firestore, superAdmin]
  );
  const { data: vendorInvoices, isLoading } =
    useCollection<VendorInvoice>(invoicesQuery);

  const filteredInvoices = useMemo(() => {
    if (!vendorInvoices) return [];
    if (!searchTerm) return vendorInvoices;
    return vendorInvoices.filter(invoice =>
      invoice.vendorName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [vendorInvoices, searchTerm]);

  const statusVariant = {
    Paid: 'default',
    Pending: 'secondary',
    Overdue: 'destructive',
  } as const;
  
  const createNotification = (title: string, message: string, type: 'payment_failure' | 'new_vendor' | 'support_ticket' = 'payment_failure') => {
    if (!superAdmin) return;
    const notifRef = collection(firestore, 'superAdmins', superAdmin.uid, 'notifications');
    addDocumentNonBlocking(notifRef, {
      title,
      message,
      type,
      isRead: false,
      createdAt: serverTimestamp(),
    })
  }
  
  const handleMarkAsPaid = (invoice: VendorInvoice) => {
    if (invoice.status === 'Paid' || !firestore) return;
    const invoiceRef = doc(firestore, 'vendorInvoices', invoice.id);
    updateDocumentNonBlocking(invoiceRef, { status: 'Paid' });
    toast({
      title: 'Invoice Updated',
      description: `Invoice for ${invoice.vendorName} marked as Paid.`,
    });
    createNotification('Payment Recorded', `Successfully marked invoice for ${invoice.vendorName} as paid.`);
  };
  
  const handleVoidClick = (invoice: VendorInvoice) => {
    setSelectedInvoice(invoice);
    setIsAlertOpen(true);
  };
  
  const handleVoidConfirm = () => {
    if (!selectedInvoice || !firestore) return;
    const invoiceRef = doc(firestore, 'vendorInvoices', selectedInvoice.id);
    deleteDocumentNonBlocking(invoiceRef);
    toast({
      variant: 'destructive',
      title: 'Invoice Voided',
      description: `Invoice for ${selectedInvoice.vendorName} has been deleted.`,
    });
    createNotification('Invoice Voided', `Invoice #${selectedInvoice.id.substring(0,6)} for ${selectedInvoice.vendorName} was voided.`);
    setIsAlertOpen(false);
    setSelectedInvoice(null);
  };

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
    const downloadUrl = invoice.stripeInvoicePdfUrl || invoice.stripeReceiptUrl;
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
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

  const handleSendInvoice = (invoice: VendorInvoice) => {
    // Placeholder for sending email
    console.log(`Sending invoice ${invoice.id} to ${invoice.vendorName}`);
    toast({
      title: 'Invoice Sent',
      description: `An email reminder has been sent for invoice to ${invoice.vendorName}.`,
    });
    createNotification('Invoice Reminder Sent', `A reminder for invoice #${invoice.id.substring(0,6)} was sent to ${invoice.vendorName}.`);
  };

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


  return (
    <>
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendor Invoices</h1>
          <p className="text-muted-foreground">
            Track and manage all vendor subscription invoices.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>All Invoices</CardTitle>
            <CardDescription>
              A list of all invoices generated for vendors.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by vendor name..." 
                  className="pl-10" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
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
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-5 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                       <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-48" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-8" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredInvoices && filteredInvoices.length > 0 ? (
                  filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {invoice.vendorName}
                      </TableCell>
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
                                <span>Download</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSendInvoice(invoice)}>
                                <Send className="mr-2 h-4 w-4" />
                                <span>Send Invoice</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
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
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      {searchTerm ? 'No invoices match your search.' : 'No invoices found.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
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
