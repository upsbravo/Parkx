
'use client';

import { useState, useEffect } from 'react';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Megaphone, X } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

type VendorAnnouncement = {
  id: string;
  title: string;
  content: string;
  isActive: boolean;
};

type EndUser = {
    acknowledgedAnnouncements?: string[];
}

export function AnnouncementBanner() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [hasAcknowledged, setHasAcknowledged] = useState(false);

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userData } = useDoc<EndUser>(userDocRef);

  const announcementsQuery = useMemoFirebase(() => {
    if (!user || !userData) return null;
    return query(
      collection(firestore, 'vendors', (userData as any).vendorId, 'announcements'),
      where('isActive', '==', true)
    );
  }, [user, userData, firestore]);
  
  const { data: announcements, isLoading } = useCollection<VendorAnnouncement>(announcementsQuery);
  
  const activeAnnouncement = useMemo(() => {
    if (!announcements || announcements.length === 0) return null;
    const acknowledgedIds = userData?.acknowledgedAnnouncements || [];
    // Find the first announcement that has NOT been acknowledged
    return announcements.find(a => !acknowledgedIds.includes(a.id)) || null;
  }, [announcements, userData]);

  const handleAcknowledge = async () => {
    if (!user || !activeAnnouncement || !userData) return;

    const newAcknowledged = [...(userData.acknowledgedAnnouncements || []), activeAnnouncement.id];
    
    await updateDocumentNonBlocking(userDocRef!, {
        acknowledgedAnnouncements: newAcknowledged
    });
    // Optimistically hide the banner
  };

  if (isLoading) {
    return <Skeleton className="h-16 w-full rounded-none" />;
  }

  if (!activeAnnouncement) {
    return null;
  }
  
  // This check hides the banner optimistically as soon as the user checks the box
  const acknowledgedIds = userData?.acknowledgedAnnouncements || [];
  if(acknowledgedIds.includes(activeAnnouncement.id)) {
      return null;
  }

  return (
    <div className="w-full bg-primary/10 border-b-2 border-primary/20">
        <div className="container mx-auto p-4">
            <div className="flex items-start gap-4">
                <Megaphone className="h-6 w-6 text-primary mt-1" />
                <div className="flex-1">
                    <h3 className="font-bold text-primary">{activeAnnouncement.title}</h3>
                    <p className="text-sm text-primary/80">{activeAnnouncement.content}</p>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox id="acknowledge" onCheckedChange={(checked) => setHasAcknowledged(Boolean(checked))} />
                    <label htmlFor="acknowledge" className="text-sm font-medium leading-none">I understand</label>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleAcknowledge}
                        disabled={!hasAcknowledged}
                        className="p-2 h-auto"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    </div>
  );
}
