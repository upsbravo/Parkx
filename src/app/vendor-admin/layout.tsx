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
  const [isStripeCheckComplete, setIsStripeCheckComplete] = useState(false);

  const vendorRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, "vendors", user.uid) : null),
    [user, firestore]
  );
  
  const { data: vendorData, isLoading: isVendorLoading } = useDoc<Vendor>(vendorRef);
  
  useEffect(() => {
    const performChecks = async () => {
      if (isUserLoading || isVendorLoading) {
        return; // Wait for data to load
      }
      
      if (!isUserLoading && !user) {
        router.replace('/login');
        return;
      }

      if (user && vendorData) {
        const { profileComplete, agreementSigned, stripeAccountId } = vendorData;

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

        // 3. If everything is signed, check Stripe status
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
        setIsStripeCheckComplete(true);
      } else if (!isUserLoading && user && !isVendorLoading && !vendorData) {
        // Fallback for an authenticated user who is not a vendor
        router.replace('/login');
      }
    };
    
    performChecks();
  }, [user, vendorData, isUserLoading, isVendorLoading, pathname, router]);

  const isLoading = isUserLoading || isVendorLoading || !isStripeCheckComplete;
  
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
