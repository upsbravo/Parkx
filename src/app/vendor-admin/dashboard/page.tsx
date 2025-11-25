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
  TriangleAlert,
} from 'lucide-react';

export default function VendorAdminDashboard() {
  const stats = [
    {
      title: 'Total Users',
      value: '0',
      description: '+2 from last month',
      icon: <Users className="h-4 w-4 text-muted-foreground" />,
    },
    {
      title: 'Occupied Spots',
      value: '0 / 0',
      description: '0% capacity',
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
      value: '3',
      description: '2 new since yesterday',
      icon: <TriangleAlert className="h-4 w-4 text-muted-foreground" />,
    },
  ];

  return (
    <div className="flex-1 space-y-4">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of the parking management system.
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
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="col-span-1 lg:col-span-3">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          <div className="flex h-48 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No recent activity.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
