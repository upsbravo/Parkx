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
  onboardingLink?: string;
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

    // If auth state is resolved and there is no user, redirect to login
    if (!isUserLoading && !user) {
      router.replace('/login');
      return;
    }

    if (user && vendorData) {
      const { profileComplete, agreementSigned, onboardingLink, status } = vendorData;

      // 1. If profile is not complete, force completion.
      if (!profileComplete && pathname !== '/vendor-admin/complete-profile') {
        router.replace('/vendor-admin/complete-profile');
        return;
      }
      
      // 2. If profile complete, but agreement not signed, force agreement page.
      if (profileComplete && !agreementSigned && pathname !== '/vendor-admin/master-agreement') {
        router.replace('/vendor-admin/master-agreement');
        return;
      }
      
      // 3. If agreement is signed, but they haven't been sent to Stripe yet, redirect them.
      if (profileComplete && agreementSigned && onboardingLink && pathname !== '/vendor-admin/stripe-onboarding') {
         router.replace('/vendor-admin/stripe-onboarding');
         return;
      }

      // 4. If everything is complete, and they land on an onboarding page, redirect to dashboard.
      if (profileComplete && agreementSigned && !onboardingLink &&
          (pathname === '/vendor-admin/complete-profile' || pathname === '/vendor-admin/master-agreement' || pathname === '/vendor-admin/stripe-onboarding')) {
        router.replace('/vendor-admin/dashboard');
        return;
      }
    }
  }, [user, vendorData, isUserLoading, isVendorLoading, pathname, router]);


  const isLoading = isUserLoading || isVendorLoading;
  
  if (isLoading || !user) {
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
