'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from "@/components/dashboard-layout";
import SuperAdminNav from "@/components/nav/super-admin-nav";
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userRoleRef = useMemoFirebase(
    () => (user ? doc(firestore, 'roles_super_admin', user.uid) : null),
    [user, firestore]
  );
  const { data: userRole, isLoading: isRoleLoading } = useDoc(userRoleRef);

  useEffect(() => {
    if (isUserLoading || isRoleLoading) {
      return; // Wait for auth and role data to load
    }

    if (!user) {
      // Not logged in at all
      router.replace('/login');
      return;
    }

    if (!userRole) {
      // Logged in, but not a super admin
      console.error("Access denied. User is not a super admin.");
      router.replace('/login');
    }
  }, [user, userRole, isUserLoading, isRoleLoading, router]);

  const isLoading = isUserLoading || isRoleLoading;

  if (isLoading || !user || !userRole) {
    // Show a loading skeleton while we verify the user's role
    return (
      <DashboardLayout nav={<SuperAdminNav />} role="Super Admin">
        <div className="space-y-4 p-4 md:p-6">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout nav={<SuperAdminNav />} role="Super Admin">
      {children}
    </DashboardLayout>
  );
}
