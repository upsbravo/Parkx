'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from "@/components/dashboard-layout";
import SuperAdminNav from "@/components/nav/super-admin-nav";
import { useAuth, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { onAuthStateChanged } from 'firebase/auth';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !firestore) {
        // Firebase services are not ready yet.
        return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // No user logged in, redirect to login page.
        router.replace('/login');
        return;
      }

      // User is logged in, now check their role in Firestore.
      const roleRef = doc(firestore, 'roles_super_admin', user.uid);
      const roleSnap = await getDoc(roleRef);

      if (roleSnap.exists()) {
        // User has the super admin role.
        setIsAuthorized(true);
      } else {
        // User does not have the role, redirect them.
        router.replace('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, firestore, router]);


  // While we verify the user's role, show a loading skeleton.
  if (loading) {
    return (
      <DashboardLayout nav={<SuperAdminNav />} role="Super Admin">
        <div className="space-y-4 p-4 md:p-6">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  // If the user is authorized, render the children. Otherwise, render nothing
  // as the redirect is already in progress.
  return isAuthorized ? (
    <DashboardLayout nav={<SuperAdminNav />} role="Super Admin">
      {children}
    </DashboardLayout>
  ) : null;
}
