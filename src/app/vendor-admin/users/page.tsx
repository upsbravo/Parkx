
"use client";

import { useState } from "react";
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
import { MoreHorizontal, PlusCircle, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { endUsers } from "@/lib/data";
import { InviteUserDialog } from "./invite-user-dialog";

export default function UserManagementPage() {
  const [isInviteOpen, setInviteOpen] = useState(false);

  const statusVariant = {
    Active: "default",
    Pending: "secondary",
    Inactive: "destructive",
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground">
              View, manage, and take action on user accounts.
            </p>
          </div>
          <Button onClick={() => setInviteOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Invite User
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              A list of all users for Acme Parking, including pending registrations and ex-users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name or email..." className="pl-10" />
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Spot</TableHead>
                  <TableHead>Spot Since</TableHead>
                  <TableHead>Next Bill</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {endUsers.length > 0 ? (
                  endUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                           variant={
                            statusVariant[user.status] as
                              | "default"
                              | "secondary"
                              | "destructive"
                          }
                        >
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.spotId || 'N/A'}</TableCell>
                      <TableCell>
                        {user.spotSince ? new Date(user.spotSince).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {user.nextBill ? new Date(user.nextBill).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              aria-haspopup="true"
                              size="icon"
                              variant="ghost"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                            <DropdownMenuItem>Assign Spot</DropdownMenuItem>
                             <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                              Deactivate User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <InviteUserDialog open={isInviteOpen} onOpenChange={setInviteOpen} />
    </>
  );
}
