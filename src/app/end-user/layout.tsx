
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
  profileComplete?: boolean;
  waiverSigned?: boolean;
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

  useEffect(() => {
    if (isUserLoading || isUserDataLoading) {
      return; // Wait for data to load
    }
    
    // If user is loaded and has a profile
    if (user && userData) {
      // 1. If profile is not complete, redirect to complete it
      if (!userData.profileComplete && pathname !== '/end-user/complete-profile') {
        router.replace('/end-user/complete-profile');
      }
      // 2. If profile is complete but waiver is not signed, redirect to waiver
      else if (userData.profileComplete && !userData.waiverSigned && pathname !== '/end-user/waiver') {
        router.replace('/end-user/waiver');
      }
    }
  }, [user, userData, isUserLoading, isUserDataLoading, pathname, router]);

  const isLoading = isUserLoading || isUserDataLoading;

  // Show a loading skeleton while we determine the user's state
  if (isLoading) {
    return (
      <DashboardLayout nav={<EndUserNav />} role="End User">
        <div className="space-y-4 p-4 md:p-6">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }
  
  const isAllowedToSeeContent = 
    (pathname === '/end-user/complete-profile' && !userData?.profileComplete) ||
    (pathname === '/end-user/waiver' && userData?.profileComplete && !userData?.waiverSigned) ||
    (userData?.profileComplete && userData?.waiverSigned);

  // Render a loading state for a frame while redirection happens
  // This prevents flashing content that the user shouldn't see
  if (!isAllowedToSeeContent) {
     return (
       <DashboardLayout nav={<EndUserNav />} role="End User">
        <div className="space-y-4 p-4 md:p-6">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
     )
  }

  return (
    <DashboardLayout nav={<EndUserNav />} role="End User">
      <AnnouncementBanner />
      {children}
    </DashboardLayout>
  );
}
