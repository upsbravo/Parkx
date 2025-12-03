
'use client';

import { useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, Edit, Pin, PinOff, Sparkles } from 'lucide-react';
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
import { Switch } from "@/components/ui/switch";
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

type Announcement = {
  id: string;
  title: string;
  content: string;
  authorName: string;
  createdAt: any;
  isPinned: boolean;
};

export default function ContentManagementPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const announcementsQuery = useMemoFirebase(() => {
    return query(collection(firestore, 'announcements'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: announcements, isLoading } = useCollection<Announcement>(announcementsQuery);

  const openNewDialog = () => {
    setEditingAnnouncement(null);
    setTitle('');
    setContent('');
    setIsPinned(false);
    setIsDialogOpen(true);
  };

  const openEditDialog = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setTitle(announcement.title);
    setContent(announcement.content);
    setIsPinned(announcement.isPinned);
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
        // Update existing announcement
        const docRef = doc(firestore, 'announcements', editingAnnouncement.id);
        await updateDocumentNonBlocking(docRef, { title, content, isPinned });
        toast({ title: 'Success', description: 'Announcement has been updated.' });
      } else {
        // Create new announcement
        const collectionRef = collection(firestore, 'announcements');
        await addDocumentNonBlocking(collectionRef, {
          title,
          content,
          isPinned,
          authorName: user.displayName || 'Super Admin',
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Success', description: 'New announcement has been published.' });
      }
      setIsDialogOpen(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save announcement.' });
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (announcementId: string) => {
    const docRef = doc(firestore, 'announcements', announcementId);
    deleteDocumentNonBlocking(docRef);
    toast({ variant: 'destructive', title: 'Deleted', description: 'Announcement has been removed.' });
  };
  
  const handleGenerateSummary = () => {
      toast({title: 'AI Summary', description: "This would call a Genkit flow to summarize news and populate the form."})
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Content Management</h1>
            <p className="text-muted-foreground">
              Create, edit, and manage global announcements and blog posts.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleGenerateSummary}>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Weekly Summary
            </Button>
            <Button onClick={openNewDialog}>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Post
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Published Announcements</CardTitle>
            <CardDescription>All posts visible on the public announcements page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
                Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
            ) : announcements && announcements.length > 0 ? (
              announcements.map((post) => (
                <Card key={post.id} className="flex items-start p-4 gap-4">
                  {post.isPinned && <Pin className="h-5 w-5 mt-1 text-primary" />}
                  <div className="flex-1">
                    <h3 className="font-semibold">{post.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{post.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      By {post.authorName} on {post.createdAt ? format(post.createdAt.toDate(), 'PPP') : '...'}
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
                <p>No announcements published yet.</p>
                <Button variant="link" onClick={openNewDialog}>Create your first post</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAnnouncement ? 'Edit Announcement' : 'Create New Post'}</DialogTitle>
            <DialogDescription>
              This will be published on the public announcements page.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} rows={8} />
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="isPinned" checked={isPinned} onCheckedChange={setIsPinned} />
              <Label htmlFor="isPinned">Pin this post to the top</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save & Publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
