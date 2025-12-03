
'use client';

import { useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, Edit, Megaphone } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

type VendorAnnouncement = {
  id: string;
  title: string;
  content: string;
  createdAt: any;
  isActive: boolean;
};

export default function VendorAnnouncementsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<VendorAnnouncement | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const announcementsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'vendors', user.uid, 'announcements'), orderBy('createdAt', 'desc'));
  }, [user, firestore]);

  const { data: announcements, isLoading } = useCollection<VendorAnnouncement>(announcementsQuery);

  const openNewDialog = () => {
    setEditingAnnouncement(null);
    setTitle('');
    setContent('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (announcement: VendorAnnouncement) => {
    setEditingAnnouncement(announcement);
    setTitle(announcement.title);
    setContent(announcement.content);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user || !title || !content) {
      toast({ variant: 'destructive', title: 'Error', description: 'Title and content cannot be empty.' });
      return;
    }
    setIsSaving(true);
    
    try {
      if (editingAnnouncement) {
        const docRef = doc(firestore, 'vendors', user.uid, 'announcements', editingAnnouncement.id);
        await updateDocumentNonBlocking(docRef, { title, content });
        toast({ title: 'Success', description: 'Announcement has been updated.' });
      } else {
        const collectionRef = collection(firestore, 'vendors', user.uid, 'announcements');
        await addDocumentNonBlocking(collectionRef, {
          title,
          content,
          isActive: true,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Success', description: 'New announcement has been posted for your users.' });
      }
      setIsDialogOpen(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save announcement.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (announcementId: string) => {
    if (!user) return;
    const docRef = doc(firestore, 'vendors', user.uid, 'announcements', announcementId);
    deleteDocumentNonBlocking(docRef);
    toast({ variant: 'destructive', title: 'Deleted', description: 'Announcement has been removed.' });
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Announcements</h1>
            <p className="text-muted-foreground">
              Create and manage alerts and announcements for all of your users.
            </p>
          </div>
          <Button onClick={openNewDialog}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Announcement
          </Button>
        </div>

        <Alert>
          <Megaphone className="h-4 w-4" />
          <AlertTitle>How Announcements Work</AlertTitle>
          <AlertDescription>
            When you post a new announcement, all of your end-users will see a banner on their dashboard until they acknowledge it.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>My Published Announcements</CardTitle>
            <CardDescription>A history of all alerts you have sent to your users.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
            ) : announcements && announcements.length > 0 ? (
              announcements.map((post) => (
                <Card key={post.id} className="flex items-center p-4 gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold">{post.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">{post.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Posted on {post.createdAt ? format(post.createdAt.toDate(), 'PPP') : '...'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(post)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(post.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>You haven't posted any announcements yet.</p>
                <Button variant="link" onClick={openNewDialog}>Post your first announcement</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}</DialogTitle>
            <DialogDescription>
              This will be displayed as a dismissible banner to all your active users.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Lot Closure This Weekend" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Message</Label>
              <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} rows={5} placeholder="Please be advised that the parking lot will be closed for maintenance..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Posting...' : 'Post Announcement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
