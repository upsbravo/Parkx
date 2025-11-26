
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
import { InviteUserDialog } from "./invite-user-dialog";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { AssignSpotDialog } from "./assign-spot-dialog";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type EndUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: 'Active' | 'Pending' | 'Inactive';
  assignedSpotId: string | null;
};


export default function UserManagementPage() {
  const [isInviteOpen, setInviteOpen] = useState(false);
  const [isAssignSpotOpen, setAssignSpotOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<EndUser | null>(null);
  
  const firestore = useFirestore();
  const { user: vendorAdmin, isUserLoading: isVendorLoading } = useUser();

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !vendorAdmin) return null;
    return query(collection(firestore, "vendors", vendorAdmin.uid, "endUsers"));
  }, [firestore, vendorAdmin]);

  const { data: endUsers, isLoading: areUsersLoading } = useCollection<EndUser>(usersQuery);
  
  const isLoading = isVendorLoading || areUsersLoading;

  const statusVariant = {
    Active: "default",
    Pending: "secondary",
    Inactive: "destructive",
  };

  const handleAssignSpot = (user: EndUser) => {
    setSelectedUser(user);
    setAssignSpotOpen(true);
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
            Create User
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              A list of all users for your business, including pending and former users.
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
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                   Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-4 w-32 mt-1" />
                      </TableCell>
                      <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : endUsers && endUsers.length > 0 ? (
                  endUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-medium">{user.firstName} {user.lastName}</div>
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
                      <TableCell>{user.assignedSpotId || 'N/A'}</TableCell>
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
                            <DropdownMenuItem asChild>
                                <Link href={`/vendor-admin/users/${user.id}`}>Edit User Profile</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAssignSpot(user)}>Assign Spot</DropdownMenuItem>
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
                      colSpan={4}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No users found. Create one to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <InviteUserDialog open={isInviteOpen} onOpenChange={setInviteOpen} />
      {selectedUser && (
        <>
          <AssignSpotDialog
            user={selectedUser}
            open={isAssignSpotOpen}
            onOpenChange={setAssignSpotOpen}
          />
        </>
      )}
    </>
  );
}
