import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle, ParkingSquare } from 'lucide-react';

export default function EndUserDashboard() {
  const recentActivities = [
    {
      title: 'Spot A-12 Assigned',
      description: 'Your request for spot A-12 was approved.',
      time: '6 minutes ago',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome, John</h1>
        <p className="text-muted-foreground">
          Manage your assigned spot and view recent activity.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ParkingSquare className="h-6 w-6 text-primary" />
              <CardTitle>Current Spot</CardTitle>
            </div>
            <CardDescription>
              Details about your currently assigned parking spot.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-5xl font-bold">A-12</p>
              <p className="text-muted-foreground">Assigned: Nov 25, 2025</p>
            </div>
            <Button variant="destructive">
              <ArrowRight className="mr-2 h-4 w-4 -scale-x-100" />
              Request Cancellation
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {recentActivities.map((activity, index) => (
                <li key={index} className="flex items-start gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{activity.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {activity.description}
                    </p>
                  </div>
                  <time className="text-xs text-muted-foreground">
                    {activity.time}
                  </time>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}