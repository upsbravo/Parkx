'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import DashboardLayout from "@/components/dashboard-layout";
import VendorAdminNav from "@/components/nav/vendor-admin-nav";
import { useAuth, useFirestore } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Skeleton } from '@/components/ui/skeleton';
import { getStripeAccountStatus } from '@/ai/flows/get-stripe-account-status-flow';
import { onAuthStateChanged } from 'firebase/auth';

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
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const [vendorData, setVendorData] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !firestore) {
        return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!user) {
            router.replace('/login');
            return;
        }

        const vendorRef = doc(firestore, "vendors", user.uid);
        const vendorSnap = await getDoc(vendorRef);

        if (!vendorSnap.exists()) {
            router.replace('/login');
            return;
        }
        
        const data = vendorSnap.data() as Vendor;
        setVendorData(data);
        
        const { profileComplete, agreementSigned, stripeAccountId } = data;

        // Onboarding flow enforcement
        if (!profileComplete && pathname !== '/vendor-admin/complete-profile') {
          router.replace('/vendor-admin/complete-profile');
        } else if (profileComplete && !agreementSigned && pathname !== '/vendor-admin/master-agreement') {
          router.replace('/vendor-admin/master-agreement');
        } else if (profileComplete && agreementSigned && stripeAccountId) {
            const status = await getStripeAccountStatus({ stripeAccountId });
            if (!status.payouts_enabled && pathname !== '/vendor-admin/stripe-onboarding') {
                router.replace('/vendor-admin/stripe-onboarding');
            } else if (status.payouts_enabled) {
                const onboardingUrls = ['/vendor-admin/complete-profile', '/vendor-admin/master-agreement', '/vendor-admin/stripe-onboarding'];
                if (onboardingUrls.includes(pathname)) {
                    router.replace('/vendor-admin/dashboard');
                }
            }
        }
        setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, firestore, pathname, router]);


  // While we verify the user's state, show a loading skeleton.
  if (loading) {
     return (
       <DashboardLayout nav={<VendorAdminNav />} role="Vendor Admin">
        <div className="space-y-4 p-4 md:p-6">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }
  
  const onboardingUrls = [
      '/vendor-admin/complete-profile',
      '/vendor-admin/master-agreement',
      '/vendor-admin/stripe-onboarding'
  ];
  
  const isFullyOnboarded = vendorData?.profileComplete && vendorData?.agreementSigned;
  const isAllowedToSeeContent = isFullyOnboarded || onboardingUrls.includes(pathname);
  
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
