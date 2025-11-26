
'use client';

import { useState, useMemo, useRef } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  useUser,
  addDocumentNonBlocking,
} from '@/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  or,
} from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, Download } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { useToast } from '@/hooks/use-toast';

type Vendor = {
  id: string;
  name: string;
  email: string;
};

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

export default function VendorMessagesPage() {
  const { user: superAdmin, isUserLoading: isSuperAdminLoading } = useUser();
  const firestore = useFirestore();
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [messageText, setMessageText] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const vendorsQuery = useMemoFirebase(
    () =>
      superAdmin
        ? query(
            collection(firestore, 'vendors')
          )
        : null,
    [superAdmin, firestore]
  );
  const { data: vendors, isLoading: areVendorsLoading } = useCollection<Vendor>(vendorsQuery);

  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !superAdmin || !selectedVendor) return null;

    return query(
      collection(firestore, 'communications'),
       or(
           where('senderId', '==', superAdmin.uid),
           where('receiverId', '==', superAdmin.uid)
       ),
      orderBy('timestamp', 'asc')
    );
  }, [firestore, superAdmin, selectedVendor]);
  const { data: messages, isLoading: areMessagesLoading } = useCollection<Message>(messagesQuery);
  
  const filteredMessages = useMemo(() => {
    if(!messages || !superAdmin || !selectedVendor) return [];
    return messages.filter(msg => 
        (msg.senderId === superAdmin.uid && msg.receiverId === selectedVendor.id) ||
        (msg.senderId === selectedVendor.id && msg.receiverId === superAdmin.uid)
    );
  }, [messages, superAdmin, selectedVendor]);

  const handleSendMessage = async () => {
    if ((!messageText && !attachment) || !superAdmin || !selectedVendor) return;

    setIsSending(true);
    let attachmentData: Partial<Message> = {};

    if (attachment) {
        try {
            const storage = getStorage();
            const fileRef = storageRef(storage, `communications/${superAdmin.uid}/${selectedVendor.id}/${Date.now()}_${attachment.name}`);
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
      senderId: superAdmin.uid,
      receiverId: selectedVendor.id,
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

  const isLoading = isSuperAdminLoading || areVendorsLoading;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vendor Messages</h1>
        <p className="text-muted-foreground">
          Review and respond to support requests from vendors.
        </p>
      </div>
      <div className="grid h-[calc(100vh-10rem)] gap-6 md:grid-cols-3">
        <Card className="md:col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {isLoading ? (
                <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </div>
            ) : (
            <ul className="divide-y">
              {vendors?.map((vendor) => (
                <li
                  key={vendor.id}
                  onClick={() => setSelectedVendor(vendor)}
                  className={`p-4 hover:bg-muted/50 cursor-pointer rounded-lg ${selectedVendor?.id === vendor.id ? 'bg-muted' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarImage src={`https://picsum.photos/seed/vendor-${vendor.id}/40/40`} />
                        <AvatarFallback>{vendor.name?.[0]}</AvatarFallback>
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
        <div className="md:col-span-2">
          <Card className="h-full flex flex-col">
            {selectedVendor ? (
                <>
                <CardHeader>
                    <CardTitle>Conversation with {selectedVendor.name}</CardTitle>
                </CardHeader>
                <ScrollArea className="flex-1 p-6">
                    <div className="space-y-4">
                    {areMessagesLoading ? <Skeleton className="h-20 w-full" /> : 
                        filteredMessages.map((msg) => (
                            <div key={msg.id} className={`flex items-start gap-3 ${msg.senderId === superAdmin?.uid ? 'justify-end' : ''}`}>
                                {msg.senderId !== superAdmin?.uid && (
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={`https://picsum.photos/seed/vendor-${msg.senderId}/32/32`} />
                                        <AvatarFallback>{selectedVendor.name?.[0]}</AvatarFallback>
                                    </Avatar>
                                )}
                                <div className={`max-w-xs rounded-lg p-3 text-sm ${msg.senderId === superAdmin?.uid ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                    <p className="font-bold mb-1">{msg.senderId === superAdmin?.uid ? 'You (Super Admin)' : selectedVendor.name}</p>
                                    <p>{msg.message}</p>
                                    {msg.attachmentUrl && (
                                        <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-2 text-xs underline">
                                            <Download className="h-3 w-3" />
                                            {msg.attachmentName || 'View Attachment'}
                                        </a>
                                    )}
                                    <p className="text-xs opacity-70 mt-2 text-right">{format(new Date(msg.timestamp), 'p')}</p>
                                </div>
                                 {msg.senderId === superAdmin?.uid && (
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback>SA</AvatarFallback>
                                    </Avatar>
                                )}
                            </div>
                        ))
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
                        />
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex gap-1">
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                            <Button type="button" size="icon" variant="ghost" onClick={handleAttachmentClick} disabled={isSending}>
                                <Paperclip className="h-4 w-4" />
                            </Button>
                            <Button type="submit" size="icon" onClick={handleSendMessage} disabled={isSending}>
                                {isSending ? <Skeleton className="h-4 w-4 rounded-full"/> : <Send className="h-4 w-4" />}
                                <span className="sr-only">Send</span>
                            </Button>
                        </div>
                    </div>
                </CardFooter>
                </>
            ) : (
                <CardContent className="flex h-full items-center justify-center p-6">
                    <div className="text-center">
                    <p className="text-muted-foreground">Select a conversation to start messaging.</p>
                    </div>
                </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
