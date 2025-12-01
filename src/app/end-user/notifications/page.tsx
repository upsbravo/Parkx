
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser, useFirestore, useMemoFirebase, useCollection, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BellOff, Check } from 'lucide-react';
import { format } from 'date-fns';

type Notification = {
  id: string;
  title: string;
  message: string;
  type: 'invoice' | 'message' | 'payment';
  isRead: boolean;
  createdAt: any; // Firestore timestamp
};

const formatDate = (timestamp: any) => {
    if (!timestamp) return '...';
    if (timestamp.toDate) {
      return format(timestamp.toDate(), 'PPp');
    }
    return format(new Date(timestamp), 'PPp');
};


export default function NotificationsPage() {
  const [isClient, setIsClient] = useState(false);
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const notificationsQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'users', user.uid, 'notifications'), orderBy('createdAt', 'desc')) : null),
    [user, firestore]
  );
  const { data: notifications, isLoading: areNotificationsLoading } = useCollection<Notification>(notificationsQuery);
  
  const handleMarkAsRead = (notificationId: string) => {
    if (!user) return;
    const notifRef = doc(firestore, 'users', user.uid, 'notifications', notificationId);
    updateDocumentNonBlocking(notifRef, { isRead: true });
  };
  
  const isLoading = isUserLoading || areNotificationsLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          All Notifications
        </h1>
        <p className="text-muted-foreground">
          A complete history of all your account notifications.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notification History</CardTitle>
          <CardDescription>A log of all important events related to your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 inline-block" /></TableCell>
                  </TableRow>
                ))
              ) : notifications && notifications.length > 0 ? (
                notifications.map((notif) => (
                  <TableRow key={notif.id} className={!notif.isRead ? 'bg-muted/50' : ''}>
                    <TableCell className="font-mono text-xs">{formatDate(notif.createdAt)}</TableCell>
                    <TableCell className="font-medium">{notif.title}</TableCell>
                    <TableCell className="max-w-[300px] truncate">{notif.message}</TableCell>
                    <TableCell>
                      <Badge variant={notif.isRead ? 'secondary' : 'default'}>
                        {notif.isRead ? 'Read' : 'Unread'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {!notif.isRead && (
                        <Button variant="ghost" size="icon" onClick={() => handleMarkAsRead(notif.id)}>
                            <Check className="h-4 w-4" />
                            <span className="sr-only">Mark as Read</span>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <BellOff className="mx-auto h-8 w-8 text-muted-foreground" />
                     <p className="mt-2">You have no notifications yet.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
