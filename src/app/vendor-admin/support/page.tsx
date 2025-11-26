// src/app/vendor-admin/support/page.tsx
'use client';

import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { MessageFeed } from '@/components/MessageFeed';
import { SendMessageBox } from '@/components/SendMessageBox';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LifeBuoy } from 'lucide-react';

export default function MySupportPage() {
  const { user: vendorAdmin, isUserLoading } = useUser();
  const firestore = useFirestore();
  
  const messagesQuery = useMemoFirebase(() => {
    if (!vendorAdmin) return null;
    return query(
      collection(firestore, 'vendors', vendorAdmin.uid, 'support-messages'),
      orderBy('timestamp', 'asc')
    );
  }, [vendorAdmin, firestore]);
  
  const { data: messages, isLoading: areMessagesLoading } = useCollection(messagesQuery);
  
  const isLoading = isUserLoading || areMessagesLoading;
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Support</h1>
        <p className="text-muted-foreground">
          Communicate directly with the ParkX Super Admin for platform support.
        </p>
      </div>

      <Card className="flex flex-col h-[calc(100vh-14rem)]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <LifeBuoy className="h-6 w-6 text-muted-foreground" />
            <div>
                <CardTitle>Your Conversation with Super Admin</CardTitle>
                <CardDescription>All messages are logged. Expect a response within 24 hours.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <MessageFeed 
            messages={messages || []} 
            isLoading={isLoading} 
            contactName="Super Admin" 
            contactInitial="SA"
            currentUserId={vendorAdmin?.uid}
        />
        {vendorAdmin && (
            <SendMessageBox 
                targetCollectionPath={`vendors/${vendorAdmin.uid}/support-messages`} 
                senderId={vendorAdmin.uid}
            />
        )}
      </Card>
    </div>
  );
}
