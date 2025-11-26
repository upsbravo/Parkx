
'use client';

import { useState, useMemo, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Headset, Paperclip, Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
  addDocumentNonBlocking,
} from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { useToast } from '@/hooks/use-toast';

// This is the hardcoded UID for the super admin account from the seed script.
const SUPER_ADMIN_ID = 'PH1p3JvXPSNh2CfiSxzOW2sjlDf1';

type Message = {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: 'image' | 'file';
};

export default function VendorSupportPage() {
  const { user: vendorAdmin, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [messageText, setMessageText] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const messagesQuery = useMemoFirebase(() => {
    // This now points to a non-existent path. We are keeping the component
    // but the functionality is now handled by the Super Admin messages page.
    // A real implementation might point to a vendor-specific support thread.
    // For now, it will just be an empty, read-only conversation.
    if (!firestore || !vendorAdmin) return null;
    return query(collection(firestore, 'vendors', vendorAdmin.uid, 'supportMessages'), orderBy('timestamp', 'asc'));
  }, [firestore, vendorAdmin]);

  const { data: messages, isLoading: messagesLoading } = useCollection<Message>(messagesQuery);


  const handleSendMessage = async () => {
    toast({
        title: "Feature Not Available",
        description: "Please ask your Super Admin to message you from their dashboard.",
    });
  };
  
  const handleAttachmentClick = () => {
     toast({
        title: "Feature Not Available",
        description: "Please ask your Super Admin to message you from their dashboard.",
    });
  };


  const isLoading = isUserLoading || messagesLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contact Support</h1>
        <p className="text-muted-foreground">
          For support, please ask your Super Admin to initiate a conversation with you from their dashboard.
        </p>
      </div>

      <Card className="flex flex-col h-[calc(100vh-12rem)]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Headset className="h-6 w-6 text-muted-foreground" />
            <div>
              <CardTitle>Your Conversation with Support</CardTitle>
              <CardDescription>
                This is a read-only view of your support conversations.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-4">
          {isLoading ? <Skeleton className="h-20 w-full" /> :
             messages && messages.length > 0 ? (
                messages.map((msg) => (
                    <div key={msg.id} className={`flex items-start gap-3 ${msg.senderId === vendorAdmin?.uid ? 'justify-end' : ''}`}>
                        {msg.senderId !== vendorAdmin?.uid && (
                            <Avatar className="h-8 w-8">
                               <AvatarFallback>SA</AvatarFallback>
                            </Avatar>
                        )}
                        <div className={`max-w-xs rounded-lg p-3 text-sm ${msg.senderId === vendorAdmin?.uid ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            <p className="font-bold mb-1">{msg.senderId === vendorAdmin?.uid ? 'You' : 'Support'}</p>
                            <p>{msg.text}</p>
                            {msg.attachmentUrl && (
                                <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-2 text-xs underline">
                                    <Download className="h-3 w-3" />
                                    {msg.attachmentName || 'View Attachment'}
                                </a>
                            )}
                            <p className="text-xs opacity-70 mt-2 text-right">{format(new Date(msg.timestamp), 'p')}</p>
                        </div>
                        {msg.senderId === vendorAdmin?.uid && (
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={`https://picsum.photos/seed/${vendorAdmin.uid}/32/32`} />
                                <AvatarFallback>ME</AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                ))
            ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                    No support messages yet.
                </div>
            )
          }
          </div>
        </ScrollArea>
        <CardFooter className="border-t p-4">
          <div className="relative w-full">
            <Textarea
              placeholder="This is a read-only message view."
              className="pr-20"
              rows={1}
              value={""}
              readOnly
              disabled={true}
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex gap-1">
                <Button type="button" size="icon" variant="ghost" onClick={handleAttachmentClick} disabled={true}>
                    <Paperclip className="h-4 w-4" />
                </Button>
                <Button type="submit" size="icon" onClick={handleSendMessage} disabled={true}>
                    <Send className="h-4 w-4" />
                    <span className="sr-only">Send</span>
                </Button>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
