'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import DashboardLayout from "@/components/dashboard-layout";
import VendorAdminNav from "@/components/nav/vendor-admin-nav";
import { useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { doc } from "firebase/firestore";
import { Skeleton } from '@/components/ui/skeleton';
import { getStripeAccountStatus } from '@/ai/flows/get-stripe-account-status-flow';

type Vendor = {
  name: string;
  logoUrl?: string;
  status: string;
  profileComplete?: boolean;
  agreementSigned?: boolean;
  onboardingLink?: string;
  stripeAccountId?: string;
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
    // Don't run any logic until both user and vendor data have finished loading
    if (isUserLoading || isVendorLoading) {
      return; 
    }

    // If no user is logged in, redirect to login
    if (!user) {
      router.replace('/login');
      return;
    }
    
    // If a user is logged in but they have no corresponding vendor document, they don't belong here.
    if (!vendorData) {
        router.replace('/login');
        return;
    }

    const checkOnboardingStatus = async () => {
        const { profileComplete, agreementSigned, stripeAccountId } = vendorData;

        // 1. Force profile completion
        if (!profileComplete && pathname !== '/vendor-admin/complete-profile') {
          router.replace('/vendor-admin/complete-profile');
          return;
        }
        
        // 2. Force agreement signing
        if (profileComplete && !agreementSigned && pathname !== '/vendor-admin/master-agreement') {
          router.replace('/vendor-admin/master-agreement');
          return;
        }

        // 3. Force Stripe onboarding
        if (profileComplete && agreementSigned && stripeAccountId) {
            const status = await getStripeAccountStatus({ stripeAccountId });
            if (!status.payouts_enabled) {
                // If payouts are NOT enabled, force them to the onboarding page
                if (pathname !== '/vendor-admin/stripe-onboarding') {
                    router.replace('/vendor-admin/stripe-onboarding');
                    return;
                }
            } else {
                 // If payouts ARE enabled and they are on an onboarding page, send to dashboard.
                 if (pathname === '/vendor-admin/complete-profile' || pathname === '/vendor-admin/master-agreement' || pathname === '/vendor-admin/stripe-onboarding') {
                    router.replace('/vendor-admin/dashboard');
                    return;
                 }
            }
        }
    }
    
    checkOnboardingStatus();
    
  }, [user, vendorData, isUserLoading, isVendorLoading, pathname, router]);

  // Show a loading skeleton while we determine the user's state
  // Or if they aren't a vendor
  if (isUserLoading || isVendorLoading || !vendorData) {
     return (
       <DashboardLayout nav={<VendorAdminNav />} role="Vendor Admin">
        <div className="space-y-4 p-4 md:p-6">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  // Define the set of onboarding URLs
  const onboardingUrls = [
      '/vendor-admin/complete-profile',
      '/vendor-admin/master-agreement',
      '/vendor-admin/stripe-onboarding'
  ];

  // Determine if the user is allowed to see the content
  // They are allowed if they have completed everything OR if they are on one of the onboarding pages.
  const isFullyOnboarded = vendorData.profileComplete && vendorData.agreementSigned; // We check stripe status inside useEffect
  const isAllowedToSeeContent = isFullyOnboarded || onboardingUrls.includes(pathname);


  if (!isAllowedToSeeContent) {
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
