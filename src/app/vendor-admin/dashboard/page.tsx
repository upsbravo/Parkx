"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { endUsers, parkingSpots } from "@/lib/data";
import { Mail, Car, ClipboardCheck, Percent } from "lucide-react";
import Link from "next/link";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell } from "recharts";

const chartData = [
  { status: "Occupied", count: parkingSpots.filter(s => s.status === "Occupied").length, fill: "hsl(var(--primary))" },
  { status: "Available", count: parkingSpots.filter(s => s.status === "Available").length, fill: "hsl(var(--muted))" },
  { status: "Reserved", count: parkingSpots.filter(s => s.status === "Reserved").length, fill: "hsl(var(--accent))" },
];

const chartConfig = {
  count: {
    label: "Spots",
  },
  Occupied: {
    label: "Occupied",
    color: "hsl(var(--primary))",
  },
  Available: {
    label: "Available",
    color: "hsl(var(--muted))",
  },
  Reserved: {
    label: "Reserved",
    color: "hsl(var(--accent))",
  },
} satisfies ChartConfig;

export default function VendorAdminDashboard() {

  const totalSpots = parkingSpots.length;
  const occupiedSpots = chartData.find(d => d.status === "Occupied")?.count || 0;
  const pendingRequests = endUsers.filter(u => u.status === "Pending").length;
  
  return (
    <div className="grid gap-6">
       <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSpots > 0 ? ((occupiedSpots / totalSpots) * 100).toFixed(0) : 0}%</div>
            <p className="text-xs text-muted-foreground">{occupiedSpots} of {totalSpots} spots are occupied</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spots</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSpots}</div>
            <p className="text-xs text-muted-foreground">Request more from Super Admin</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{pendingRequests}</div>
            <p className="text-xs text-muted-foreground">New users waiting for spots</p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Branding</CardTitle>
            <CardDescription>Customize your user-facing elements.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button>Upload Logo</Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-5">
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Recent User Activity</CardTitle>
            <CardDescription>A list of the most recent users for your lot.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned Spot</TableHead>
                  <TableHead>Vehicle Plate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {endUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.status === 'Active' ? 'default' : 'secondary'}>{user.status}</Badge>
                    </TableCell>
                    <TableCell>{user.spotId || "N/A"}</TableCell>
                    <TableCell>{user.plate}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Spot Status</CardTitle>
            <CardDescription>Current availability of your parking spots.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px]">
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie data={chartData} dataKey="count" nameKey="status" innerRadius={60}>
                  {chartData.map((entry) => (
                    <Cell key={entry.status} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
