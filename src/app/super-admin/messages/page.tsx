// src/app/super-admin/messages/page.tsx
'use client';

import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { useState } from 'react';
import { MessageFeed } from '@/components/MessageFeed';
import { SendMessageBox } from '@/components/SendMessageBox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building, MessageSquare } from 'lucide-react';

type Vendor = {
  id: string;
  name: string;
  email: string;
};

export default function SuperAdminMessagesPage() {
  const { user: superAdmin } = useUser();
  const firestore = useFirestore();
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);

  const vendorsQuery = useMemoFirebase(() => superAdmin ? query(collection(firestore, 'vendors'), orderBy('name', 'asc')) : null, [superAdmin, firestore]);
  const { data: vendors, isLoading: areVendorsLoading } = useCollection<Vendor>(vendorsQuery);

  const messagesQuery = useMemoFirebase(() => {
      if (!selectedVendorId) return null;
      return query(
          collection(firestore, 'vendors', selectedVendorId, 'support-messages'),
          orderBy('timestamp', 'asc')
      );
  }, [selectedVendorId, firestore]);
  const { data: messages, isLoading: areMessagesLoading } = useCollection(messagesQuery);

  const selectedVendor = vendors?.find(v => v.id === selectedVendorId);

  return (
    <div className="grid h-[calc(100vh-6rem)] md:grid-cols-4">
      <Card className="md:col-span-1 flex flex-col rounded-r-none">
          <CardHeader>
            <CardTitle>Vendor Tickets</CardTitle>
            <CardDescription>Select a vendor to view their support conversation.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {areVendorsLoading ? <Skeleton className="h-20 w-full" /> : (
            <ul className="divide-y">
              {vendors?.map((vendor) => (
                <li
                  key={vendor.id}
                  onClick={() => setSelectedVendorId(vendor.id)}
                  className={`p-4 hover:bg-muted/50 cursor-pointer rounded-lg ${selectedVendorId === vendor.id ? 'bg-muted' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarFallback><Building className="h-4 w-4" /></AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold">{vendor.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{vendor.email}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            )}
          </CardContent>
        </Card>
      <div className="md:col-span-3 flex flex-col border-t md:border-t-0 md:border-l">
        {selectedVendorId && selectedVendor ? (
          <>
            <CardHeader className='border-b'>
              <div className="flex items-center gap-3">
                <MessageSquare className="h-6 w-6 text-muted-foreground" />
                <div>
                  <CardTitle>Conversation with {selectedVendor.name}</CardTitle>
                  <CardDescription>This is the support thread for this vendor.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <MessageFeed
                messages={messages || []}
                isLoading={areMessagesLoading}
                contactName={selectedVendor.name}
                contactInitial={selectedVendor.name?.[0] || 'V'}
                currentUserId={superAdmin?.uid}
            />
            <SendMessageBox 
                targetCollectionPath={`vendors/${selectedVendorId}/support-messages`} 
                senderId={superAdmin!.uid}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a vendor to view their support tickets.
          </div>
        )}
      </div>
    </div>
  );
}
