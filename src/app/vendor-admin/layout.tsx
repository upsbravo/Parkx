'use client';
import DashboardLayout from "@/components/dashboard-layout";
import VendorAdminNav from "@/components/nav/vendor-admin-nav";
import { useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { doc } from "firebase/firestore";

type Vendor = {
  name: string;
  logoUrl?: string;
};

export default function VendorAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  // Ensure user and firestore are available before creating the doc ref
  const vendorRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, "vendors", user.uid) : null),
    [user, firestore]
  );
  
  // The useDoc hook will now wait until vendorRef is not null
  const { data: vendorData, isLoading: isVendorLoading } = useDoc<Vendor>(vendorRef);
  
  const isLoading = isUserLoading || isVendorLoading;

  return (
    <DashboardLayout
      nav={<VendorAdminNav />}
      role="Vendor Admin"
      vendorName={isLoading ? undefined : vendorData?.name}
      vendorLogo={isLoading ? undefined : vendorData?.logoUrl}
    >
      {children}
    </DashboardLayout>
  );
}
