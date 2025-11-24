import DashboardLayout from "@/components/dashboard-layout";
import VendorAdminNav from "@/components/nav/vendor-admin-nav";

export default function VendorAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout nav={<VendorAdminNav />} role="Vendor Admin">
      {children}
    </DashboardLayout>
  );
}
