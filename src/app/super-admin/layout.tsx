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
    // While initial user or role data is loading, we don't do anything.
    if (isUserLoading || isRoleLoading) {
      return; 
    }

    // After loading, if there's no authenticated user, redirect to login.
    if (!user) {
      router.replace('/login');
      return;
    }

    // If there IS a user but NO role document, it means they are not a super admin.
    if (user && !userRole) {
      router.replace('/login');
    }
  }, [user, userRole, isUserLoading, isRoleLoading, router]);

  const isLoading = isUserLoading || isRoleLoading;

  // While we verify the user's role, show a loading skeleton.
  // Also, if the user is authenticated but does not have the `userRole`, we show the loading skeleton
  // which prevents a "flash" of the real content before the redirect in the useEffect kicks in.
  if (isLoading || !userRole) {
    return (
      <DashboardLayout nav={<SuperAdminNav />} role="Super Admin">
        <div className="space-y-4 p-4 md:p-6">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  // Only render children if all checks pass
  return (
    <DashboardLayout nav={<SuperAdminNav />} role="Super Admin">
      {children}
    </DashboardLayout>
  );
}
