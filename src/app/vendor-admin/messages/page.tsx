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
import { Send, Paperclip, File as FileIcon, Download } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { useToast } from '@/hooks/use-toast';

type EndUser = {
  id: string;
  firstName: string;
  lastName: string;
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

export default function VendorUserMessagesPage() {
  const { user: vendorAdmin, isUserLoading: isVendorLoading } = useUser();
  const firestore = useFirestore();
  const [selectedUser, setSelectedUser] = useState<EndUser | null>(null);
  const [messageText, setMessageText] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const usersQuery = useMemoFirebase(
    () =>
      vendorAdmin
        ? query(
            collection(firestore, 'users'),
            where('vendorId', '==', vendorAdmin.uid)
          )
        : null,
    [vendorAdmin, firestore]
  );
  const { data: users, isLoading: areUsersLoading } = useCollection<EndUser>(usersQuery);

  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !vendorAdmin || !selectedUser) return null;

    return query(
      collection(firestore, 'communications'),
      where('senderId', 'in', [vendorAdmin.uid, selectedUser.id]),
      where('receiverId', 'in', [vendorAdmin.uid, selectedUser.id]),
      orderBy('timestamp', 'asc')
    );
  }, [firestore, vendorAdmin, selectedUser]);
  const { data: messages, isLoading: areMessagesLoading } = useCollection<Message>(messagesQuery);
  
  // Filter messages on the client to ensure we only show messages between the two selected parties
  const filteredMessages = useMemo(() => {
    if(!messages || !vendorAdmin || !selectedUser) return [];
    return messages.filter(msg => 
        (msg.senderId === vendorAdmin.uid && msg.receiverId === selectedUser.id) ||
        (msg.senderId === selectedUser.id && msg.receiverId === vendorAdmin.uid)
    );
  }, [messages, vendorAdmin, selectedUser]);

  const handleSendMessage = async () => {
    if ((!messageText && !attachment) || !vendorAdmin || !selectedUser) return;

    setIsSending(true);
    let attachmentData: Partial<Message> = {};

    if (attachment) {
        try {
            const storage = getStorage();
            const fileRef = storageRef(storage, `communications/${vendorAdmin.uid}/${selectedUser.id}/${Date.now()}_${attachment.name}`);
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
      receiverId: selectedUser.id,
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

  const isLoading = isVendorLoading || areUsersLoading;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Messages</h1>
        <p className="text-muted-foreground">
          Review and respond to messages from your users.
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
              {users?.map((user) => (
                <li
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`p-4 hover:bg-muted/50 cursor-pointer rounded-lg ${selectedUser?.id === user.id ? 'bg-muted' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarImage src={`https://picsum.photos/seed/${user.id}/40/40`} />
                        <AvatarFallback>{user.firstName?.[0]}{user.lastName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold">{user.firstName} {user.lastName}</p>
                        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
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
            {selectedUser ? (
                <>
                <CardHeader>
                    <CardTitle>Conversation with {selectedUser.firstName}</CardTitle>
                </CardHeader>
                <ScrollArea className="flex-1 p-6">
                    <div className="space-y-4">
                    {areMessagesLoading ? <Skeleton className="h-20 w-full" /> : 
                        filteredMessages.map((msg) => (
                            <div key={msg.id} className={`flex items-start gap-3 ${msg.senderId === vendorAdmin?.uid ? 'justify-end' : ''}`}>
                                {msg.senderId !== vendorAdmin?.uid && (
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={`https://picsum.photos/seed/${msg.senderId}/32/32`} />
                                        <AvatarFallback>{selectedUser.firstName?.[0]}</AvatarFallback>
                                    </Avatar>
                                )}
                                <div className={`max-w-xs rounded-lg p-3 text-sm ${msg.senderId === vendorAdmin?.uid ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                    <p className="font-bold mb-1">{msg.senderId === vendorAdmin?.uid ? 'You' : selectedUser.firstName}</p>
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
                                        <AvatarFallback>ME</AvatarFallback>
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

    