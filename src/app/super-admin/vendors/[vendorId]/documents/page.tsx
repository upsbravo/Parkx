
'use client';

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
import { Button } from '@/components/ui/button';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Download } from 'lucide-react';

type Vendor = {
    name: string;
};

type VendorDocument = {
    id: string;
    name: string;
    createdAt: string; // ISO string
    content: string;
};

export default function VendorDocumentsPage() {
  const params = useParams();
  const vendorId = params.vendorId as string;
  const firestore = useFirestore();

  const vendorRef = useMemoFirebase(
    () => (firestore && vendorId ? doc(firestore, 'vendors', vendorId) : null),
    [firestore, vendorId]
  );
  const { data: vendor, isLoading: isVendorLoading } = useDoc<Vendor>(vendorRef);

  const documentsQuery = useMemoFirebase(
    () => (firestore && vendorId ? collection(firestore, `vendors/${vendorId}/vendorDocuments`) : null),
    [firestore, vendorId]
  );
  const { data: documents, isLoading: areDocumentsLoading } = useCollection<VendorDocument>(documentsQuery);

  const handleDownloadDocument = (doc: VendorDocument) => {
    const blob = new Blob([doc.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.name.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const isLoading = isVendorLoading || areDocumentsLoading;

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
                <Link href="/super-admin/vendors">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
            </Button>
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    Documents for {isLoading ? <Skeleton className="h-8 w-48 inline-block" /> : vendor?.name}
                </h1>
                <p className="text-muted-foreground">
                    View and download all documents associated with this vendor.
                </p>
            </div>
        </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendor Documents</CardTitle>
          <CardDescription>
            Includes signed agreements and other important records.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document Name</TableHead>
                <TableHead>Date Created</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                 Array.from({ length: 1 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={3}><Skeleton className="h-10 w-full" /></TableCell>
                  </TableRow>
                 ))
              ) : documents && documents.length > 0 ? (
                documents.map((doc) => (
                    <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.name}</TableCell>
                        <TableCell>{new Date(doc.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleDownloadDocument(doc)}>
                                <Download className="h-4 w-4" />
                            </Button>
                        </TableCell>
                    </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    No documents found for this vendor.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
