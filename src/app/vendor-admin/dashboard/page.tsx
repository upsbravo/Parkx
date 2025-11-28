'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Users,
  Car,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis, Pie, PieChart, Cell } from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { useMemo } from 'react';
import { format, subMonths, differenceInDays } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';


type Vendor = {
  spotLimit: number;
};

type EndUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  waiverSignedDate?: string;
};

type ParkingSpot = {
  isAvailable: boolean;
};

type UserInvoice = {
    id: string;
    userName: string;
    amount: number;
    dueDate: string;
    status: 'Pending' | 'Overdue' | 'Paid';
};

export default function VendorAdminDashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const vendorRef = useMemoFirebase(
    () => (user ? doc(firestore, 'vendors', user.uid) : null),
    [user, firestore]
  );
  const { data: vendorData, isLoading: isVendorLoading } = useDoc<Vendor>(vendorRef);

  const usersQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'users'), where('vendorId', '==', user.uid)) : null),
    [user, firestore]
  );
  const { data: usersData, isLoading: areUsersLoading } = useCollection<EndUser>(usersQuery);

  const spotsQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'vendors', user.uid, 'parkingSpots') : null),
    [user, firestore]
  );
  const { data: spotsData, isLoading: areSpotsLoading } = useCollection<ParkingSpot>(spotsQuery);
  
  const invoicesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `vendors/${user.uid}/userInvoices`), where('status', 'in', ['Pending', 'Overdue']));
  }, [firestore, user]);
  const { data: pendingInvoices, isLoading: invoicesLoading } = useCollection<UserInvoice>(invoicesQuery);

  const overdueInvoices = useMemo(() => {
      if (!pendingInvoices) return [];
      return pendingInvoices.filter(invoice => 
          invoice.status === 'Overdue' || differenceInDays(new Date(), new Date(invoice.dueDate)) > 0
      );
  }, [pendingInvoices]);

  
  const isLoading = isUserLoading || isVendorLoading || areUsersLoading || areSpotsLoading || invoicesLoading;
  
  const totalUsers = usersData?.length ?? 0;
  const totalSpots = vendorData?.spotLimit ?? 0;
  const occupiedSpots = spotsData?.filter(spot => !spot.isAvailable).length ?? 0;
  const availableSpots = (spotsData?.length ?? 0) - occupiedSpots;
  const occupancyPercentage = totalSpots > 0 ? Math.round((occupiedSpots / totalSpots) * 100) : 0;


  const stats = [
    {
      title: 'Total Users',
      value: totalUsers.toString(),
      description: 'Active users in your lot',
      icon: <Users className="h-4 w-4 text-muted-foreground" />,
    },
    {
      title: 'Occupied Spots',
      value: `${occupiedSpots} / ${totalSpots}`,
      description: `${occupancyPercentage}% capacity`,
      icon: <Car className="h-4 w-4 text-muted-foreground" />,
    },
    {
      title: 'Quarterly Revenue',
      value: '$0',
      description: 'Based on current occupancy',
      icon: <DollarSign className="h-4 w-4 text-muted-foreground" />,
    },
    {
      title: 'Issues Reported',
      value: '0',
      description: 'No new issues reported',
      icon: <AlertTriangle className="h-4 w-4 text-muted-foreground" />,
    },
  ];
  
  const spotStatusData = useMemo(() => {
    return [
      { status: 'Occupied', count: occupiedSpots, fill: 'hsl(var(--chart-1))' },
      { status: 'Available', count: availableSpots, fill: 'hsl(var(--chart-2))' },
    ];
  }, [occupiedSpots, availableSpots]);
  
  const userGrowthData = useMemo(() => {
    const now = new Date();
    const data = Array.from({ length: 6 }).map((_, i) => {
      const month = subMonths(now, 5 - i);
      return { month: format(month, 'MMM'), newUsers: 0 };
    });

    if (usersData) {
      usersData.forEach(user => {
        if (user.waiverSignedDate) {
          const joinDate = new Date(user.waiverSignedDate);
          const monthDiff = (now.getFullYear() - joinDate.getFullYear()) * 12 + now.getMonth() - joinDate.getMonth();
          if (monthDiff >= 0 && monthDiff < 6) {
            const index = 5 - monthDiff;
            data[index].newUsers += 1;
          }
        }
      });
    }
    return data;
  }, [usersData]);
  
  const recentUsers = useMemo(() => {
    if (!usersData) return [];
    return [...usersData]
      .filter(u => u.waiverSignedDate)
      .sort((a, b) => new Date(b.waiverSignedDate!).getTime() - new Date(a.waiverSignedDate!).getTime())
      .slice(0, 5);
  }, [usersData]);

  const chartConfig = {
      newUsers: { label: 'New Users', color: 'hsl(var(--chart-1))' },
      Occupied: { label: 'Occupied', color: 'hsl(var(--chart-1))' },
      Available: { label: 'Available', color: 'hsl(var(--chart-2))' },
  } as const;

  return (
    <div className="flex-1 space-y-4">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your parking management system.
        </p>
      </div>

      {isLoading ? <Skeleton className="h-24 w-full" /> : overdueInvoices.length > 0 && (
            <Card className="border-destructive/50">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="h-6 w-6 text-destructive" />
                        <CardTitle className="text-destructive">Action Required: {overdueInvoices.length} Overdue Invoice(s)</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {overdueInvoices.slice(0, 3).map(inv => (
                            <div key={inv.id} className="flex justify-between items-center text-sm">
                                <p><span className="font-semibold">{inv.userName}</span> is {differenceInDays(new Date(), new Date(inv.dueDate))} days overdue on invoice for ${inv.amount.toFixed(2)}.</p>
                            </div>
                        ))}
                        {overdueInvoices.length > 3 && <p className="text-sm text-muted-foreground">...and {overdueInvoices.length - 3} more.</p>}
                    </div>
                </CardContent>
                <CardContent>
                     <Button asChild variant="destructive">
                        <Link href="/vendor-admin/user-invoices">View All Invoices</Link>
                    </Button>
                </CardContent>
            </Card>
        )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <>
                  <Skeleton className="h-8 w-1/2" />
                  <Skeleton className="h-4 w-3/4 mt-1" />
                </>
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

       <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader>
                <CardTitle>User Growth</CardTitle>
                <CardDescription>New users over the last 6 months.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-80 w-full" />
                ) : (
                    <ChartContainer config={chartConfig} className="w-full h-[350px]">
                        <BarChart data={userGrowthData}>
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
                                allowDecimals={false}
                            />
                            <Tooltip
                                cursor={false}
                                content={<ChartTooltipContent indicator="dot" />}
                            />
                            <Bar dataKey="newUsers" fill="var(--color-newUsers)" radius={4} />
                        </BarChart>
                    </ChartContainer>
                )}
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Spot Occupancy</CardTitle>
                <CardDescription>Current state of your parking spots.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-80 w-full" />
                ) : (
                    <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[350px]">
                        <PieChart>
                            <Tooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                            <Pie data={spotStatusData} dataKey="count" nameKey="status" innerRadius={60} strokeWidth={5}>
                                {spotStatusData.map((entry) => (
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
          <CardTitle>Recent Activity</CardTitle>
           <CardDescription>Newest users to complete their profile.</CardDescription>
        </CardHeader>
        <CardContent>
           {isLoading ? (
              <div className="space-y-4">
                  <Skeleton className="h-12 w-full"/>
                  <Skeleton className="h-12 w-full"/>
              </div>
            ) : recentUsers.length > 0 ? (
                <div className="space-y-4">
                {recentUsers.map((user) => (
                    <div key={user.id} className="flex items-center">
                    <Avatar className="h-9 w-9">
                        <AvatarFallback>{user.firstName?.[0]}{user.lastName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="ml-4 space-y-1">
                        <p className="text-sm font-medium leading-none">{user.firstName} {user.lastName}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="ml-auto font-medium text-sm text-muted-foreground">
                        Joined {format(new Date(user.waiverSignedDate!), 'PPP')}
                    </div>
                    </div>
                ))}
                </div>
            ) : (
                 <div className="flex h-24 items-center justify-center">
                    <p className="text-sm text-muted-foreground">No recent user activity.</p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
