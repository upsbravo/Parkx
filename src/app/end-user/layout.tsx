'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import DashboardLayout from "@/components/dashboard-layout";
import EndUserNav from "@/components/nav/end-user-nav";
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';

type EndUser = {
  id: string;
  vendorId: string;
  profileComplete?: boolean;
  waiverSigned?: boolean;
};

type Vendor = {
  name: string;
  logoUrl?: string;
};

export default function EndUserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userData, isLoading: isUserDataLoading } = useDoc<EndUser>(userDocRef);

  const vendorDocRef = useMemoFirebase(
    () => (firestore && userData?.vendorId ? doc(firestore, 'vendors', userData.vendorId) : null),
    [firestore, userData?.vendorId]
  );
  const { data: vendorData, isLoading: isVendorDataLoading } = useDoc<Vendor>(vendorDocRef);

  useEffect(() => {
    // Wait for all data to finish loading before making any decisions
    if (isUserLoading || isUserDataLoading) {
      return; 
    }
    
    // If auth is done and there's no user, redirect to login
    if (!user) {
      router.replace('/login');
      return;
    }

    // If auth is done and there's a user, but they have no user document, they don't belong here
    if (!userData) {
      router.replace('/login');
      return;
    }

    // If user is loaded and has a profile, enforce the onboarding flow
    // 1. If profile is not complete, redirect to complete it
    if (!userData.profileComplete && pathname !== '/end-user/complete-profile') {
      router.replace('/end-user/complete-profile');
      return;
    }
    // 2. If profile is complete but waiver is not signed, redirect to waiver
    if (userData.profileComplete && !userData.waiverSigned && pathname !== '/end-user/waiver') {
      router.replace('/end-user/waiver');
      return;
    }
    // 3. If everything is complete, but they are on an onboarding page, redirect to dashboard
    if (userData.profileComplete && userData.waiverSigned && (pathname === '/end-user/complete-profile' || pathname === '/end-user/waiver')) {
      router.replace('/end-user/dashboard');
      return;
    }

  }, [user, userData, isUserLoading, isUserDataLoading, pathname, router]);

  const isLoading = isUserLoading || isUserDataLoading || isVendorDataLoading;
  
  // Define the set of URLs that are part of the onboarding process
  const onboardingUrls = [
    '/end-user/complete-profile',
    '/end-user/waiver'
  ];

  // Determine if content can be shown. It can if:
  // 1. The user is fully onboarded (profile and waiver complete)
  // 2. The user is currently on one of the onboarding pages
  const isAllowedToSeeContent = (userData?.profileComplete && userData.waiverSigned) || onboardingUrls.includes(pathname);


  // While we verify the user's state, or if they don't have the right data yet, show a loading skeleton.
  if (isLoading || !userData || !isAllowedToSeeContent) {
    return (
      <DashboardLayout nav={<EndUserNav />} role="End User">
        <div className="space-y-4 p-4 md:p-6">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
        nav={<EndUserNav />} 
        role="End User"
        vendorName={vendorData?.name}
        vendorLogo={vendorData?.logoUrl}
    >
      <AnnouncementBanner />
      {children}
    </DashboardLayout>
  );
}
