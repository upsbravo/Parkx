// src/app/super-admin/messages/page.tsx
'use client';

import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { useState } from 'react';
import { MessageFeed } from '@/components/MessageFeed';
import { SendMessageBox } from '@/components/SendMessageBox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Vendor = {
  id: string;
  name: string;
};

type EndUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export default function SuperAdminMessagesPage() {
  const { user: superAdmin } = useUser();
  const firestore = useFirestore();
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const vendorsQuery = useMemoFirebase(() => superAdmin ? query(collection(firestore, 'vendors')) : null, [superAdmin, firestore]);
  const { data: vendors, isLoading: areVendorsLoading } = useCollection<Vendor>(vendorsQuery);

  const usersQuery = useMemoFirebase(() => selectedVendorId ? query(collection(firestore, 'users'), where('vendorId', '==', selectedVendorId)) : null, [firestore, selectedVendorId]);
  const { data: users, isLoading: areUsersLoading } = useCollection<EndUser>(usersQuery);

  const messagesQuery = useMemoFirebase(() => {
      if (!selectedUserId) return null;
      return query(
          collection(firestore, 'users', selectedUserId, 'messages'),
          orderBy('timestamp', 'asc')
      );
  }, [selectedUserId, firestore]);
  const { data: messages, isLoading: areMessagesLoading } = useCollection(messagesQuery);

  const selectedUser = users?.find(u => u.id === selectedUserId);

  const handleVendorChange = (vendorId: string) => {
    setSelectedVendorId(vendorId);
    setSelectedUserId(null); // Reset user selection
  }

  return (
    <div className="grid h-[calc(100vh-6rem)] md:grid-cols-4">
      <Card className="md:col-span-1 flex flex-col rounded-r-none">
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
            <div className="space-y-2 pt-2">
              <Select onValueChange={handleVendorChange} value={selectedVendorId || ""}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a Vendor..." />
                </SelectTrigger>
                <SelectContent>
                  {vendors?.map(vendor => (
                    <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {areUsersLoading && selectedVendorId ? <Skeleton className="h-20 w-full" /> : (
            <ul className="divide-y">
              {users?.map((user) => (
                <li
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  className={`p-4 hover:bg-muted/50 cursor-pointer rounded-lg ${selectedUserId === user.id ? 'bg-muted' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarFallback>{user.firstName?.[0]}{user.lastName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold">{user.firstName} {user.lastName}</p>
                        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            )}
          </CardContent>
        </Card>
      <div className="md:col-span-3 flex flex-col border-t md:border-t-0 md:border-l">
        {selectedUserId && selectedUser ? (
          <>
            <MessageFeed messages={messages || []} isLoading={areMessagesLoading} contactName={`${selectedUser.firstName} ${selectedUser.lastName}`} contactInitial={`${selectedUser.firstName?.[0] || ''}${selectedUser.lastName?.[0] || ''}`} />
            <SendMessageBox targetUserId={selectedUserId} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a vendor, then a user to view their conversation.
          </div>
        )}
      </div>
    </div>
  );
}
