'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import DashboardLayout from "@/components/dashboard-layout";
import VendorAdminNav from "@/components/nav/vendor-admin-nav";
import { useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { doc } from "firebase/firestore";
import { Skeleton } from '@/components/ui/skeleton';

type Vendor = {
  name: string;
  logoUrl?: string;
  status: 'Pending' | 'Active' | 'Trial' | 'Inactive' | 'Pending Agreement' | 'requires_payment_method';
};

export default function VendorAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  const vendorRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, "vendors", user.uid) : null),
    [user, firestore]
  );
  
  const { data: vendorData, isLoading: isVendorLoading } = useDoc<Vendor>(vendorRef);
  
  useEffect(() => {
    if (isUserLoading || isVendorLoading) {
      return;
    }

    if (user && vendorData) {
      // Rule 1: Must sign the Master Agreement first.
      if (vendorData.status === 'Pending Agreement' && pathname !== '/vendor-admin/master-agreement') {
        router.replace('/vendor-admin/master-agreement');
      } 
      // Rule 2: After trial, must provide payment method.
      else if (vendorData.status === 'requires_payment_method' && pathname !== '/vendor-admin/invoices') {
         router.replace('/vendor-admin/invoices');
      }
      // Rule 3: If they are on a page they shouldn't be on (e.g. agreement page after signing), redirect to dashboard.
      else if (vendorData.status !== 'Pending Agreement' && pathname === '/vendor-admin/master-agreement') {
        router.replace('/vendor-admin/dashboard');
      }
    }
  }, [user, vendorData, isUserLoading, isVendorLoading, pathname, router]);


  const isLoading = isUserLoading || isVendorLoading;
  
  const isAllowedToSeeContent = !isLoading && vendorData && (
    (pathname === '/vendor-admin/master-agreement' && vendorData.status === 'Pending Agreement') ||
    (pathname === '/vendor-admin/invoices' && vendorData.status === 'requires_payment_method') ||
    (vendorData.status !== 'Pending Agreement' && vendorData.status !== 'requires_payment_method')
  );


  if (isLoading) {
    return (
       <DashboardLayout nav={<VendorAdminNav />} role="Vendor Admin">
        <div className="space-y-4 p-4 md:p-6">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAllowedToSeeContent) {
     return (
       <DashboardLayout nav={<VendorAdminNav />} role="Vendor Admin">
        <div className="space-y-4 p-4 md:p-6">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
     )
  }

  return (
    <DashboardLayout
      nav={<VendorAdminNav />}
      role="Vendor Admin"
      vendorName={vendorData?.name}
      vendorLogo={vendorData?.logoUrl}
    >
      {children}
    </DashboardLayout>
  );
}
