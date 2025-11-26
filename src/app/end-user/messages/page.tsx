
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
import { Send, MessageCircle, Paperclip, Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc, setDoc, getDoc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { useToast } from '@/hooks/use-toast';

type EndUser = {
  id: string;
  vendorId: string;
  firstName: string;
};

type Vendor = {
    id: string;
    name: string;
}

type Message = {
  id: string;
  senderId: string;
  message: string;
  timestamp: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: 'image' | 'file';
};

const getConversationId = (uid1: string, uid2: string) => {
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
}

export default function EndUserMessagesPage() {
  const { user: endUser, isUserLoading: isUserLoading } = useUser();
  const firestore = useFirestore();
  const [messageText, setMessageText] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [vendorName, setVendorName] = useState('Admin');

  const userDocRef = useMemoFirebase(() => endUser ? doc(firestore, 'users', endUser.uid) : null, [endUser, firestore]);
  const { data: userData, isLoading: isUserDataLoading } = useDoc<EndUser>(userDocRef);

  useEffect(() => {
    const fetchVendorName = async () => {
        if (userData?.vendorId && firestore) {
            const vendorDocRef = doc(firestore, 'vendors', userData.vendorId);
            try {
                const vendorSnap = await getDoc(vendorDocRef);
                if (vendorSnap.exists()) {
                    setVendorName(vendorSnap.data().name || 'Admin');
                }
            } catch (error) {
                console.error("Failed to fetch vendor name:", error);
            }
        }
    };
    fetchVendorName();
  }, [userData, firestore]);

  const conversationId = useMemo(() => {
    if (!endUser || !userData?.vendorId) return null;
    return getConversationId(endUser.uid, userData.vendorId);
  }, [endUser, userData]);

  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !conversationId) return null;
    return query(collection(firestore, 'conversations', conversationId, 'messages'), orderBy('timestamp', 'asc'));
  }, [firestore, conversationId]);

  const { data: messages, isLoading: messagesLoading } = useCollection<Message>(messagesQuery);


  const handleSendMessage = async () => {
    if ((!messageText && !attachment) || !endUser || !userData?.vendorId || !conversationId) return;

    setIsSending(true);

    const conversationRef = doc(firestore, 'conversations', conversationId);
    const messagesRef = collection(conversationRef, 'messages');

    // Ensure conversation document exists
    await setDoc(conversationRef, {
        participants: [endUser.uid, userData.vendorId],
    }, { merge: true });

    let attachmentData: Partial<Message> = {};

    if (attachment) {
        try {
            const storage = getStorage();
            const fileRef = storageRef(storage, `conversations/${conversationId}/${Date.now()}_${attachment.name}`);
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
    
    await addDocumentNonBlocking(messagesRef, {
      senderId: endUser.uid,
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

  const isLoading = isUserLoading || isUserDataLoading || messagesLoading;

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
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-4">
          {isLoading ? <Skeleton className="h-20 w-full" /> :
            messages && messages.length > 0 ? (
                messages.map((msg) => (
                    <div key={msg.id} className={`flex items-start gap-3 ${msg.senderId === endUser?.uid ? 'justify-end' : ''}`}>
                        {msg.senderId !== endUser?.uid && (
                            <Avatar className="h-8 w-8">
                               <AvatarImage src={undefined} />
                               <AvatarFallback>{vendorName?.[0] || 'A'}</AvatarFallback>
                            </Avatar>
                        )}
                        <div className={`max-w-xs rounded-lg p-3 text-sm ${msg.senderId === endUser?.uid ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            <p className="font-bold mb-1">{msg.senderId === endUser?.uid ? 'You' : vendorName}</p>
                            <p>{msg.message}</p>
                             {msg.attachmentUrl && (
                                <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-2 text-xs underline">
                                    <Download className="h-3 w-3" />
                                    {msg.attachmentName || 'View Attachment'}
                                </a>
                            )}
                            <p className="text-xs opacity-70 mt-2 text-right">{format(new Date(msg.timestamp), 'p')}</p>
                        </div>
                         {msg.senderId === endUser?.uid && (
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={`https://picsum.photos/seed/${endUser.uid}/32/32`} />
                                <AvatarFallback>ME</AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                ))
            ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
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
