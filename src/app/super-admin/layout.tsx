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
    // Only perform redirects once all loading is complete
    if (!isUserLoading && !isRoleLoading) {
      if (!user || !userRole) {
        router.replace('/login');
      }
    }
  }, [user, userRole, isUserLoading, isRoleLoading, router]);

  // While we verify the user's role, or if they don't have the role, show a loading skeleton.
  // This prevents any "flash" of content before the redirect in useEffect can occur.
  const isLoading = isUserLoading || isRoleLoading;
  
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

  // Only render children if all checks pass and the user has the correct role.
  return (
    <DashboardLayout nav={<SuperAdminNav />} role="Super Admin">
      {children}
    </DashboardLayout>
  );
}
