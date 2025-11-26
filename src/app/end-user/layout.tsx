'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import DashboardLayout from "@/components/dashboard-layout";
import EndUserNav from "@/components/nav/end-user-nav";
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

type EndUser = {
  id: string;
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
    // Wait until user data is loaded to make a decision
    if (isUserLoading || isUserDataLoading) {
      return;
    }
    
    // If the user is loaded, has a profile, but hasn't signed the waiver
    if (user && userData && !userData.waiverSigned) {
      // And they are not already on the waiver page
      if (pathname !== '/end-user/waiver') {
        router.replace('/end-user/waiver');
      }
    }
  }, [user, userData, isUserLoading, isUserDataLoading, pathname, router]);

  // While checking, show a loading state instead of the actual layout to prevent flashing
  if (isUserLoading || isUserDataLoading) {
    return (
      <DashboardLayout nav={<EndUserNav />} role="End User">
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  // If user must sign waiver, and they aren't on the waiver page yet, render null
  // The useEffect above will handle the redirection.
  if (userData && !userData.waiverSigned && pathname !== '/end-user/waiver') {
     return (
      <DashboardLayout nav={<EndUserNav />} role="End User">
         {/* Render only children if it is the waiver page */}
        {pathname === '/end-user/waiver' ? children : (
             <div className="space-y-4">
              <Skeleton className="h-8 w-1/4" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
        )}
      </DashboardLayout>
    );
  }


  return (
    <DashboardLayout nav={<EndUserNav />} role="End User">
      {children}
    </DashboardLayout>
  );
}
