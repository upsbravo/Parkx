
'use client';

import {
  Bell,
  Circle,
  Users,
  ParkingSquare,
  BadgeCheck,
  CreditCard,
  Building,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from './ui/button';
import { useUser, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, limit, doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

type VendorNotification = {
  id: string;
  title: string;
  message: string;
  type: 'new_user' | 'spot_request' | 'cancellation' | 'payment_received';
  isRead: boolean;
  createdAt: any; // Firestore timestamp or string
};

const typeIcons: Record<VendorNotification['type'], React.ReactNode> = {
  new_user: <Users className="h-4 w-4" />,
  spot_request: <ParkingSquare className="h-4 w-4" />,
  cancellation: <BadgeCheck className="h-4 w-4" />,
  payment_received: <CreditCard className="h-4 w-4" />,
};

export function VendorAdminNotifications() {
  const { user } = useUser();
  const firestore = useFirestore();

  const notificationsQuery = useMemoFirebase(
    () =>
      user
        ? query(
            collection(firestore, 'vendors', user.uid, 'notifications'),
            orderBy('createdAt', 'desc'),
            limit(10)
          )
        : null,
    [user, firestore]
  );

  const { data: notifications } = useCollection<VendorNotification>(notificationsQuery);
  const unreadCount = notifications?.filter((n) => !n.isRead).length || 0;

  const handleMarkAsRead = (notificationId: string) => {
    if (!user) return;
    const notifRef = doc(
      firestore,
      'vendors',
      user.uid,
      'notifications',
      notificationId
    );
    updateDocumentNonBlocking(notifRef, { isRead: true });
  };
  
  const handleMarkAllAsRead = () => {
    if (!user || !notifications) return;
    notifications.forEach(notif => {
      if(!notif.isRead) {
        const notifRef = doc(firestore, 'vendors', user.uid, 'notifications', notif.id);
        updateDocumentNonBlocking(notifRef, { isRead: true });
      }
    });
  }
  
  const getFormattedDate = (timestamp: any) => {
    if (!timestamp) return '...';
    // Check if it's a Firestore Timestamp and convert
    if (timestamp.toDate) {
      return formatDistanceToNow(timestamp.toDate(), { addSuffix: true });
    }
    // Otherwise, assume it's a string or a Date object
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative h-9 w-9"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
              {unreadCount}
            </span>
          )}
          <span className="sr-only">Toggle notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px]">
        <div className="flex items-center justify-between p-4 pb-2 border-b">
            <h3 className="font-semibold">My Notifications</h3>
            {unreadCount > 0 && (
                 <Button variant="link" size="sm" className="p-0 h-auto" onClick={handleMarkAllAsRead}>Mark all as read</Button>
            )}
        </div>
        <div className="max-h-80 overflow-y-auto">
            {notifications && notifications.length > 0 ? (
                notifications.map(notif => (
                    <div
                        key={notif.id}
                        className={cn(
                            "flex items-start gap-4 p-4 border-b last:border-b-0",
                            !notif.isRead && "bg-blue-500/5"
                        )}
                    >
                         <div className="mt-1">{typeIcons[notif.type]}</div>
                        <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium">{notif.title}</p>
                            <p className="text-sm text-muted-foreground">{notif.message}</p>
                            <p className="text-xs text-muted-foreground">
                                {getFormattedDate(notif.createdAt)}
                            </p>
                        </div>
                        {!notif.isRead && (
                             <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMarkAsRead(notif.id)}>
                                 <Circle className="h-2 w-2 fill-blue-500 text-blue-500" />
                                 <span className="sr-only">Mark as read</span>
                             </Button>
                        )}
                    </div>
                ))
            ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">
                    You have no new notifications.
                </div>
            )}
        </div>
        <div className="p-2 text-center border-t">
            <Button variant="link" size="sm" asChild>
                <Link href="/vendor-admin/notifications">View all notifications</Link>
            </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
