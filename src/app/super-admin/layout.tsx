import DashboardLayout from "@/components/dashboard-layout";
import SuperAdminNav from "@/components/nav/super-admin-nav";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout nav={<SuperAdminNav />} role="Super Admin">
      {children}
    </DashboardLayout>
  );
}
