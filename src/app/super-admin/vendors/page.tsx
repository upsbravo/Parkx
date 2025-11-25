
"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InviteVendorDialog } from "./invite-dialog";
import { AdjustSpotLimitDialog } from "./adjust-spot-limit-dialog";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

// Define a type for the vendor data coming from Firestore
// This should align with the structure in your `backend.json` and invite dialog
type Vendor = {
  id: string;
  name: string;
  email: string;
  status: 'Pending' | 'Active' | 'Trial' | 'Inactive';
  joinDate: string; // ISO string
  trialEnds: string | null; // ISO string or null
  spotsUsed: number;
  spotLimit: number;
};


export default function VendorsPage() {
  const [isInviteOpen, setInviteOpen] = useState(false);
  const [isAdjustOpen, setAdjustOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);


  const firestore = useFirestore();
  const vendorsQuery = useMemoFirebase(() => collection(firestore, 'vendors'), [firestore]);
  const { data: vendors, isLoading } = useCollection<Vendor>(vendorsQuery);

  const statusVariant = {
    Active: "default",
    Pending: "secondary",
    Trial: "outline",
    Inactive: "destructive",
  };

  const handleAdjustClick = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setAdjustOpen(true);
  };

  const handleDeactivate = (vendor: Vendor) => {
    const vendorRef = doc(firestore, "vendors", vendor.id);
    updateDocumentNonBlocking(vendorRef, { status: "Inactive" });
    toast({
      title: "Vendor Deactivated",
      description: `${vendor.name} has been marked as inactive.`,
    });
  };

  const handleReactivate = (vendor: Vendor) => {
    const vendorRef = doc(firestore, "vendors", vendor.id);
    updateDocumentNonBlocking(vendorRef, { status: "Active" });
    toast({
      title: "Vendor Reactivated",
      description: `${vendor.name} has been marked as active.`,
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString || !isClient) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  if (!isClient) {
    return null;
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Vendor Management</h1>
            <p className="text-muted-foreground">
              Manage all vendor accounts on the ParkX platform.
            </p>
          </div>
          <Button onClick={() => setInviteOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Vendor
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>All Vendors</CardTitle>
            <CardDescription>
              A list of all vendors using ParkX.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by vendor or email..." className="pl-10" />
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trial Ends</TableHead>
                  <TableHead>Spots</TableHead>
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
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-4 w-32 mt-1" />
                      </TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : vendors && vendors.length > 0 ? (
                  vendors.map((vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell>
                        <div className="font-medium">{vendor.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {vendor.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDate(vendor.joinDate)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            statusVariant[vendor.status] as
                              | "default"
                              | "secondary"
                              | "outline"
                              | "destructive"
                          }
                        >
                          {vendor.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDate(vendor.trialEnds)}
                      </TableCell>
                      <TableCell>
                        {vendor.spotsUsed || 0} / {vendor.spotLimit}
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
                            <DropdownMenuItem>Impersonate</DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleAdjustClick(vendor)}
                            >
                              Adjust Spot Limit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/super-admin/vendors/${vendor.id}/invoices`)}>
                              View Invoices
                            </DropdownMenuItem>
                            {vendor.status === 'Inactive' ? (
                              <DropdownMenuItem
                                onClick={() => handleReactivate(vendor)}
                              >
                                Reactivate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                onClick={() => handleDeactivate(vendor)}
                              >
                                Deactivate
                              </DropdownMenuItem>
                            )}
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
                      No vendors found. Invite one to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <InviteVendorDialog open={isInviteOpen} onOpenChange={setInviteOpen} />
      {selectedVendor && (
        <AdjustSpotLimitDialog
          vendor={selectedVendor}
          open={isAdjustOpen}
          onOpenChange={setAdjustOpen}
        />
      )}
    </>
  );
}
