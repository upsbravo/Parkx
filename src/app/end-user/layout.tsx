import DashboardLayout from "@/components/dashboard-layout";
import EndUserNav from "@/components/nav/end-user-nav";

export default function EndUserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout nav={<EndUserNav />} role="End User">
      {children}
    </DashboardLayout>
  );
}
