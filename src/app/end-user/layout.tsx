'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import DashboardLayout from "@/components/dashboard-layout";
import EndUserNav from "@/components/nav/end-user-nav";
import { useAuth, useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
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
  const auth = useAuth();
  const firestore = useFirestore();

  const [userData, setUserData] = useState<EndUser | null>(null);
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

      const userDocRef = doc(firestore, 'users', user.uid);
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) {
        router.replace('/login');
        return;
      }
      
      const endUserData = userSnap.data() as EndUser;
      setUserData(endUserData);
      
      const vendorDocRef = doc(firestore, 'vendors', endUserData.vendorId);
      const vendorSnap = await getDoc(vendorDocRef);
      if (vendorSnap.exists()) {
        setVendorData(vendorSnap.data() as Vendor);
      }

      // Onboarding flow enforcement
      if (!endUserData.profileComplete && pathname !== '/end-user/complete-profile') {
        router.replace('/end-user/complete-profile');
      } else if (endUserData.profileComplete && !endUserData.waiverSigned && pathname !== '/end-user/waiver') {
        router.replace('/end-user/waiver');
      } else if (endUserData.profileComplete && endUserData.waiverSigned && (pathname === '/end-user/complete-profile' || pathname === '/end-user/waiver')) {
        router.replace('/end-user/dashboard');
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, firestore, pathname, router]);

  const onboardingUrls = ['/end-user/complete-profile', '/end-user/waiver'];
  const isAllowedToSeeContent = (userData?.profileComplete && userData?.waiverSigned) || onboardingUrls.includes(pathname);

  if (loading || !isAllowedToSeeContent) {
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
