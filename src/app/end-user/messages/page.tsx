// src/app/end-user/messages/page.tsx
'use client';

import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { useUser } from '@/firebase';
import { MessageFeed } from '@/components/MessageFeed';
import { SendMessageBox } from '@/components/SendMessageBox';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

type EndUser = {
  vendorId: string;
};

type Vendor = {
    name: string;
};

export default function EndUserMessages() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [vendorId, setVendorId] = useState<string | null>(null);

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  
  const { data: userData, isLoading: isUserDataLoading } = useDoc<EndUser>(userDocRef);

  useEffect(() => {
    if(userData?.vendorId) {
      setVendorId(userData.vendorId);
    }
  }, [userData]);

  const vendorDocRef = useMemoFirebase(() => {
    if (!vendorId) return null;
    return doc(firestore, 'vendors', vendorId);
  }, [vendorId, firestore]);
  const { data: vendorData, isLoading: isVendorDataLoading } = useDoc<Vendor>(vendorDocRef);

  const q = useMemoFirebase(() => {
      if (!user) return null;
      return query(
          collection(firestore, 'users', user.uid, 'messages'),
          orderBy('timestamp', 'asc')
      );
  }, [user, firestore]);

  const { data: messages, isLoading: areMessagesLoading } = useCollection(q);
  
  const isLoading = isUserLoading || isUserDataLoading || isVendorDataLoading || areMessagesLoading;
  const vendorName = vendorData?.name || 'Admin';
  const vendorInitial = vendorName?.[0] || 'A';
  const targetId = vendorId || ''; // Can't send without a vendor
  
  return (
      <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
        <p className="text-muted-foreground">
          Communicate with the parking administrator about any issues.
        </p>
      </div>

      <Card className="flex flex-col h-[calc(100vh-14rem)]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <MessageCircle className="h-6 w-6 text-muted-foreground" />
            <div>
              {isLoading ? (
                 <Skeleton className="h-6 w-48" />
              ) : (
                <CardTitle>Your Conversation with {vendorName}</CardTitle>
              )}
              <CardDescription>
                All messages are logged. Expect a response within 24 hours.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <MessageFeed messages={messages || []} isLoading={isLoading} contactName={vendorName} contactInitial={vendorInitial} />
        {user && <SendMessageBox targetUserId={user.uid} />}
      </Card>
    </div>
  );
}
