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
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

type Vendor = {
  spotLimit: number;
};

type EndUser = {
  id: string;
};

type ParkingSpot = {
  isAvailable: boolean;
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
  
  const isLoading = isUserLoading || isVendorLoading || areUsersLoading || areSpotsLoading;
  
  const totalUsers = usersData?.length ?? 0;
  const totalSpots = vendorData?.spotLimit ?? 0;
  const occupiedSpots = spotsData?.filter(spot => !spot.isAvailable).length ?? 0;
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
      icon: <TriangleAlert className="h-4 w-4 text-muted-foreground" />,
    },
  ];

  return (
    <div className="flex-1 space-y-4">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your parking management system.
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
