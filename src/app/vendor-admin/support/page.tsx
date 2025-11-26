
'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
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
import { collection, query, where, or, and, orderBy } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { useToast } from '@/hooks/use-toast';

// This is the hardcoded UID for the super admin account from the seed script.
const SUPER_ADMIN_ID = 'PH1p3JvXPSNh2CfiSxzOW2sjlDf1';

type Message = {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
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

  const conversationQuery = useMemoFirebase(() => {
    if (!firestore || !vendorAdmin) return null;
    return query(
      collection(firestore, 'communications'),
      or(
        and(where('senderId', '==', vendorAdmin.uid), where('receiverId', '==', SUPER_ADMIN_ID)),
        and(where('senderId', '==', SUPER_ADMIN_ID), where('receiverId', '==', vendorAdmin.uid))
      ),
      orderBy('timestamp', 'asc')
    );
  }, [firestore, vendorAdmin]);

  const { data: combinedMessages, isLoading: messagesLoading } = useCollection<Message>(conversationQuery);


  const handleSendMessage = async () => {
    if ((!messageText && !attachment) || !vendorAdmin) return;

    setIsSending(true);
    let attachmentData: Partial<Message> = {};

    if (attachment) {
        try {
            const storage = getStorage();
            const fileRef = storageRef(storage, `communications/${vendorAdmin.uid}/${SUPER_ADMIN_ID}/${Date.now()}_${attachment.name}`);
            const snapshot = await uploadBytes(fileRef, attachment);
            const downloadURL = await getDownloadURL(snapshot.ref);

            attachmentData = {
                attachmentUrl: downloadURL,
                attachmentName: attachment.name,
                attachmentType: attachment.type.startsWith('image/') ? 'image' : 'file',
            };
        } catch (error) {
            console.error("Error uploading file:", error);
            toast({ variant: "destructive", title: "Attachment Error", description: "Could not upload the attachment." });
            setIsSending(false);
            return;
        }
    }
    
    const commsCollection = collection(firestore, 'communications');
    await addDocumentNonBlocking(commsCollection, {
      senderId: vendorAdmin.uid,
      receiverId: SUPER_ADMIN_ID,
      message: messageText,
      timestamp: new Date().toISOString(),
      ...attachmentData
    });
    
    setMessageText('');
    setAttachment(null);
    setIsSending(false);
  };
  
  const handleAttachmentClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setAttachment(e.target.files[0]);
          setMessageText(e.target.files[0].name); // Show filename in text area
      }
  };

  const isLoading = isUserLoading || messagesLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contact Support</h1>
        <p className="text-muted-foreground">
          Send a message to the ParkX support team for platform-level issues or questions.
        </p>
      </div>

      <Card className="flex flex-col h-[calc(100vh-12rem)]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Headset className="h-6 w-6 text-muted-foreground" />
            <div>
              <CardTitle>Your Conversation with Support</CardTitle>
              <CardDescription>
                Describe your issue below. Please be as detailed as possible.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-4">
          {isLoading ? <Skeleton className="h-20 w-full" /> :
             combinedMessages && combinedMessages.length > 0 ? (
                combinedMessages.map((msg) => (
                    <div key={msg.id} className={`flex items-start gap-3 ${msg.senderId === vendorAdmin?.uid ? 'justify-end' : ''}`}>
                        {msg.senderId !== vendorAdmin?.uid && (
                            <Avatar className="h-8 w-8">
                               <AvatarFallback>SA</AvatarFallback>
                            </Avatar>
                        )}
                        <div className={`max-w-xs rounded-lg p-3 text-sm ${msg.senderId === vendorAdmin?.uid ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            <p className="font-bold mb-1">{msg.senderId === vendorAdmin?.uid ? 'You' : 'Support'}</p>
                            <p>{msg.message}</p>
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
                    No messages yet. Send a message to start the conversation.
                </div>
            )
          }
          </div>
        </ScrollArea>
        <CardFooter className="border-t p-4">
          <div className="relative w-full">
            <Textarea
              placeholder={attachment ? attachment.name : "Type your message..."}
              className="pr-20"
              rows={1}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              readOnly={!!attachment}
              disabled={isLoading || isSending}
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex gap-1">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                <Button type="button" size="icon" variant="ghost" onClick={handleAttachmentClick} disabled={isLoading || isSending}>
                    <Paperclip className="h-4 w-4" />
                </Button>
                <Button type="submit" size="icon" onClick={handleSendMessage} disabled={isLoading || isSending}>
                    {isSending ? <Skeleton className="h-4 w-4 rounded-full"/> : <Send className="h-4 w-4" />}
                    <span className="sr-only">Send</span>
                </Button>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
