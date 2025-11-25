'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trash2 } from 'lucide-react';
import { parkingSpots, endUsers } from '@/lib/data';

export default function ParkingLotPage() {
  const totalSpots = 50;
  const usedSpots = parkingSpots.filter(
    (spot) => spot.status !== 'Available'
  ).length;

  const getUserName = (userId: string | null) => {
    if (!userId) return 'Unassigned';
    const user = endUsers.find((user) => user.id === userId);
    return user ? user.name : 'Unknown User';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Parking Lot Setup
        </h1>
        <p className="text-muted-foreground">
          View spot assignments and manage your lot layout.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manage Spots</CardTitle>
          <CardDescription>
            Add, remove, or rename your parking spots and see who they are
            assigned to.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <Label>Spot Usage</Label>
              <span>
                {usedSpots} / {totalSpots}
              </span>
            </div>
            <Progress value={(usedSpots / totalSpots) * 100} />
          </div>

          <div className="flex w-full max-w-sm items-center space-x-2">
            <Input type="text" placeholder="New Spot Name (e.g., D1)" />
            <Button type="submit">Add Spot</Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Spot Name</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead className="w-[100px] text-right">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parkingSpots.map((spot) => (
                  <TableRow key={spot.id}>
                    <TableCell className="font-medium">{spot.name}</TableCell>
                    <TableCell>{getUserName(spot.userId)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter>
          <Button>Save Changes</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
