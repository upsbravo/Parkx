'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Pin } from 'lucide-react';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type Announcement = {
  id: string;
  title: string;
  content: string;
  authorName: string;
  createdAt: any;
  isPinned: boolean;
};

export default function AnnouncementsPage() {
  const firestore = useFirestore();

  const announcementsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'announcements'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: announcements, isLoading } = useCollection<Announcement>(announcementsQuery);
  
  const pinnedAnnouncements = announcements?.filter(a => a.isPinned) || [];
  const regularAnnouncements = announcements?.filter(a => !a.isPinned) || [];

  return (
    <div className="bg-background min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Logo />
          <Button asChild>
            <Link href="/login">Login</Link>
          </Button>
        </div>
      </header>
      
      <main className="container mx-auto py-12 px-4 md:px-6 flex-1">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight">Announcements & News</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              The latest updates and news from the ParkX platform.
            </p>
          </div>
          
          <div className="space-y-8">
            {isLoading ? (
               Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)
            ) : announcements && announcements.length > 0 ? (
              <>
                {pinnedAnnouncements.map(post => (
                  <Card key={post.id} className="border-primary/50 border-2">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-xl">{post.title}</CardTitle>
                        <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                            <Pin className="h-4 w-4" />
                            Pinned
                        </div>
                      </div>
                      <CardDescription>
                        By {post.authorName} on {post.createdAt ? format(post.createdAt.toDate(), 'PPP') : '...'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground whitespace-pre-wrap">{post.content}</p>
                    </CardContent>
                  </Card>
                ))}
                {regularAnnouncements.map(post => (
                   <Card key={post.id}>
                    <CardHeader>
                      <CardTitle>{post.title}</CardTitle>
                      <CardDescription>
                        By {post.authorName} on {post.createdAt ? format(post.createdAt.toDate(), 'PPP') : '...'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground whitespace-pre-wrap">{post.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : (
              <div className="text-center py-20 border-2 border-dashed rounded-lg">
                <h2 className="text-xl font-semibold">No Announcements Yet</h2>
                <p className="text-muted-foreground mt-2">Check back later for news and updates.</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <footer className="border-t bg-card">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row md:px-6">
          <Logo />
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} ParkX. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
