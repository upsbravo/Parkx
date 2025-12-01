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
  status: string; // Keep as string for flexibility
  profileComplete?: boolean;
  agreementSigned?: boolean;
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
      return; // Wait for all data to load
    }

    if (user && vendorData) {
      const { profileComplete, agreementSigned, status } = vendorData;

      // New Onboarding Flow
      // 1. If profile is not complete, force completion.
      if (!profileComplete && pathname !== '/vendor-admin/complete-profile') {
        router.replace('/vendor-admin/complete-profile');
        return;
      }
      
      // 2. If profile is complete, but agreement not signed, force agreement.
      // This also handles the legacy 'Pending Agreement' status.
      if (profileComplete && !agreementSigned && status !== 'Trial' && status !== 'Active' && pathname !== '/vendor-admin/master-agreement') {
        router.replace('/vendor-admin/master-agreement');
        return;
      }
      
      // 3. If everything is complete, but user is on a setup page, redirect to dashboard.
      if (profileComplete && agreementSigned && (pathname === '/vendor-admin/complete-profile' || pathname === '/vendor-admin/master-agreement')) {
        router.replace('/vendor-admin/dashboard');
        return;
      }

      // Legacy flow for requires_payment_method
      if (status === 'requires_payment_method' && pathname !== '/vendor-admin/invoices') {
         router.replace('/vendor-admin/invoices');
      }
    }
  }, [user, vendorData, isUserLoading, isVendorLoading, pathname, router]);


  const isLoading = isUserLoading || isVendorLoading;
  
  // Determine if the content should be shown based on loading state and current route vs. user state
  const isAllowedToSeeContent = !isLoading && vendorData && (
    (pathname === '/vendor-admin/complete-profile' && !vendorData.profileComplete) ||
    (pathname === '/vendor-admin/master-agreement' && vendorData.profileComplete && !vendorData.agreementSigned) ||
    (pathname === '/vendor-admin/invoices' && vendorData.status === 'requires_payment_method') ||
    (vendorData.profileComplete && vendorData.agreementSigned)
  );

  if (isLoading || !isAllowedToSeeContent) {
    return (
       <DashboardLayout nav={<VendorAdminNav />} role="Vendor Admin">
        <div className="space-y-4 p-4 md:p-6">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
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
