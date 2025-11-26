// src/app/vendor-admin/messages/page.tsx
'use client';

import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { useState } from 'react';
import { MessageFeed } from '@/components/MessageFeed';
import { SendMessageBox } from '@/components/SendMessageBox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


type EndUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export default function VendorMessages() {
  const { user: vendorAdmin } = useUser();
  const firestore = useFirestore();

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !vendorAdmin) return null;
    return query(collection(firestore, "users"), where("vendorId", "==", vendorAdmin.uid));
  }, [firestore, vendorAdmin]);

  const { data: users, isLoading: areUsersLoading } = useCollection<EndUser>(usersQuery);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const messagesQuery = useMemoFirebase(() => {
      if (!selectedUserId) return null;
      return query(
          collection(firestore, 'users', selectedUserId, 'messages'),
          orderBy('timestamp', 'asc')
      );
  }, [selectedUserId, firestore]);

  const { data: messages, isLoading: areMessagesLoading } = useCollection(messagesQuery);

  const selectedUser = users?.find(u => u.id === selectedUserId);

  return (
    <div className="grid h-[calc(100vh-6rem)] md:grid-cols-4">
      <Card className="md:col-span-1 flex flex-col rounded-r-none">
          <CardHeader>
            <CardTitle>User Conversations</CardTitle>
            <CardDescription>Select a user to view their message thread.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {areUsersLoading ? (
                <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </div>
            ) : (
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
            <MessageFeed 
                messages={messages || []} 
                isLoading={areMessagesLoading} 
                contactName={`${selectedUser.firstName} ${selectedUser.lastName}`} 
                contactInitial={`${selectedUser.firstName?.[0] || ''}${selectedUser.lastName?.[0] || ''}`}
                currentUserId={vendorAdmin?.uid}
             />
            <SendMessageBox 
                targetCollectionPath={`users/${selectedUserId}/messages`} 
                senderId={vendorAdmin!.uid}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a user to start messaging
          </div>
        )}
      </div>
    </div>
  );
}
