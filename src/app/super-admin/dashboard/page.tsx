'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Building,
  DollarSign,
  Users,
  AreaChart,
} from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";

type Vendor = {
  id: string;
  status: 'Pending' | 'Active' | 'Trial' | 'Inactive';
};

type EndUser = {
  id: string;
};


export default function SuperAdminDashboard() {
  const firestore = useFirestore();

  const vendorsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'vendors') : null), [firestore]);
  const { data: vendors, isLoading: vendorsLoading } = useCollection<Vendor>(vendorsQuery);

  const usersQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'users') : null), [firestore]);
  const { data: users, isLoading: usersLoading } = useCollection<EndUser>(usersQuery);

  const isLoading = vendorsLoading || usersLoading;

  const totalVendors = vendors?.length ?? 0;
  const activeSubscriptions = vendors?.filter(v => v.status === 'Active' || v.status === 'Trial').length ?? 0;
  const totalEndUsers = users?.length ?? 0;
  // Placeholder for MRR calculation
  const monthlyRecurringRevenue = activeSubscriptions * 250; // Assuming a placeholder value

  const stats = [
    {
      title: "Total Vendors",
      value: totalVendors.toString(),
      description: "Across the platform",
      icon: <Building className="h-4 w-4 text-muted-foreground" />,
    },
    {
      title: "Active Subscriptions",
      value: activeSubscriptions.toString(),
      description: "Vendors on a plan",
      icon: <AreaChart className="h-4 w-4 text-muted-foreground" />,
    },
    {
      title: "Monthly Recurring Revenue",
      value: `$${monthlyRecurringRevenue.toLocaleString()}`,
      description: "Based on active subscriptions",
      icon: <DollarSign className="h-4 w-4 text-muted-foreground" />,
    },
    {
      title: "Total End Users",
      value: totalEndUsers.toString(),
      description: "Across all vendors",
      icon: <Users className="h-4 w-4 text-muted-foreground" />,
    },
  ];

  return (
    <div className="flex-1 space-y-4">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Super Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          Global overview of the ParkX platform.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                 <div className="space-y-2">
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                 </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="col-span-1 lg:col-span-3">
        <CardHeader>
          <CardTitle>Recent Platform Activity</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          <div className="flex h-48 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No recent activity to display.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
