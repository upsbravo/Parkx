
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Building, DollarSign, Users, AreaChart, UserPlus } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { SUPER_ADMIN_ID } from '@/lib/seed/super-admin';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Pie,
  PieChart,
  Cell,
} from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useMemo } from 'react';
import { format, subMonths } from 'date-fns';


type Vendor = {
  id: string;
  name: string;
  joinDate: string;
  status: 'Pending' | 'Active' | 'Trial' | 'Inactive';
};

type User = {
  id: string;
  vendorId: string; // Assuming EndUser has a join date field
  // A 'createdAt' field would be ideal here. If not present, we can't track user growth over time.
  // For now, let's assume we can't track user growth if the field is missing.
};


export default function SuperAdminDashboard() {
  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();

  const vendorsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'vendors') : null), [firestore]);
  const { data: vendors, isLoading: vendorsLoading } = useCollection<Vendor>(vendorsQuery);

  const isSuperAdmin = user?.uid === SUPER_ADMIN_ID;
  const usersQuery = useMemoFirebase(() => {
    if (firestore && isSuperAdmin) {
      return collection(firestore, 'users');
    }
    return null;
  }, [firestore, isSuperAdmin]);

  const { data: users, isLoading: usersLoading } = useCollection<User>(usersQuery);

  const isLoading = isAuthLoading || vendorsLoading || (isSuperAdmin && usersLoading);

  const totalVendors = vendors?.length ?? 0;
  const activeSubscriptions = vendors?.filter(v => v.status === 'Active' || v.status === 'Trial').length ?? 0;
  const totalEndUsers = users?.length ?? 0;
  const monthlyRecurringRevenue = activeSubscriptions * 250;

  const stats = [
    { title: 'Total Vendors', value: totalVendors.toString(), description: 'Across the platform', icon: <Building className="h-4 w-4 text-muted-foreground" /> },
    { title: 'Active Subscriptions', value: activeSubscriptions.toString(), description: 'Vendors on a plan', icon: <AreaChart className="h-4 w-4 text-muted-foreground" /> },
    { title: 'Monthly Recurring Revenue', value: `$${monthlyRecurringRevenue.toLocaleString()}`, description: 'Based on active subscriptions', icon: <DollarSign className="h-4 w-4 text-muted-foreground" /> },
    { title: 'Total End Users', value: totalEndUsers.toString(), description: 'Across all vendors', icon: <Users className="h-4 w-4 text-muted-foreground" /> },
  ];

  const vendorStatusData = useMemo(() => {
    if (!vendors) return [];
    const statusCounts = vendors.reduce((acc, vendor) => {
        acc[vendor.status] = (acc[vendor.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
        fill: `hsl(var(--chart-${Object.keys(statusCounts).indexOf(status) + 1}))`
    }));
  }, [vendors]);
  
  const platformGrowthData = useMemo(() => {
    const now = new Date();
    const data = Array.from({ length: 6 }).map((_, i) => {
        const month = subMonths(now, 5 - i);
        return {
            month: format(month, 'MMM'),
            newVendors: 0,
            newUsers: 0, // We can't implement this yet without a join date on users
        };
    });

    if (vendors) {
        vendors.forEach(vendor => {
            const joinDate = new Date(vendor.joinDate);
            const monthDiff = (now.getFullYear() - joinDate.getFullYear()) * 12 + now.getMonth() - joinDate.getMonth();
            if (monthDiff >= 0 && monthDiff < 6) {
                const index = 5 - monthDiff;
                data[index].newVendors += 1;
            }
        });
    }

    return data;
}, [vendors]);

 const recentVendors = useMemo(() => {
    if (!vendors) return [];
    return [...vendors]
      .sort((a, b) => new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime())
      .slice(0, 5);
  }, [vendors]);

  const chartConfig = {
      newVendors: { label: 'New Vendors', color: 'hsl(var(--chart-1))' },
      newUsers: { label: 'New Users', color: 'hsl(var(--chart-2))' },
  };


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
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
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
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Platform Growth</CardTitle>
            <CardDescription>New vendors over the last 6 months.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
             {isLoading ? (
                <div className="h-80 w-full flex items-center justify-center">
                    <Skeleton className="h-full w-full"/>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={350}>
                 <BarChart data={platformGrowthData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey="month"
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value}`}
                    />
                     <Tooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="dot" />}
                    />
                     <Legend content={<ChartLegendContent />} />
                    <Bar dataKey="newVendors" fill="var(--color-newVendors)" radius={4} />
                 </BarChart>
                </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vendor Status</CardTitle>
            <CardDescription>Distribution of vendor accounts.</CardDescription>
          </CardHeader>
          <CardContent>
             {isLoading ? (
                <div className="h-80 w-full flex items-center justify-center">
                    <Skeleton className="h-full w-full"/>
                </div>
            ) : (
                <ChartContainer config={{}} className="mx-auto aspect-square h-[350px]">
                  <PieChart>
                    <Tooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                    <Pie
                        data={vendorStatusData}
                        dataKey="count"
                        nameKey="status"
                        innerRadius={60}
                        strokeWidth={5}
                    >
                         {vendorStatusData.map((entry) => (
                            <Cell key={`cell-${entry.status}`} fill={entry.fill} />
                        ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent nameKey="status" />} className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center" />
                  </PieChart>
                </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
      
       <Card>
          <CardHeader>
            <CardTitle>Recent Platform Activity</CardTitle>
            <CardDescription>Newest vendors to join ParkX.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-12 w-full"/>
                    <Skeleton className="h-12 w-full"/>
                </div>
            ) : recentVendors.length > 0 ? (
                <div className="space-y-4">
                {recentVendors.map((vendor) => (
                    <div key={vendor.id} className="flex items-center">
                    <Avatar className="h-9 w-9">
                        <AvatarFallback><Building className="h-4 w-4"/></AvatarFallback>
                    </Avatar>
                    <div className="ml-4 space-y-1">
                        <p className="text-sm font-medium leading-none">{vendor.name}</p>
                        <p className="text-sm text-muted-foreground">{vendor.email}</p>
                    </div>
                    <div className="ml-auto font-medium text-sm text-muted-foreground">
                        Joined {format(new Date(vendor.joinDate), 'PPP')}
                    </div>
                    </div>
                ))}
                </div>
            ) : (
                 <div className="flex h-24 items-center justify-center">
                    <p className="text-sm text-muted-foreground">No recent activity to display.</p>
                </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
