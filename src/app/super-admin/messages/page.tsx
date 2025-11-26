
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
  doc,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Vendor = {
  id: string;
  name: string;
  email: string;
};

type EndUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  vendorId: string;
}

type Message = {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: 'image' | 'file';
};

export default function SuperAdminMessagesPage() {
  const { user: superAdmin, isUserLoading: isSuperAdminLoading } = useUser();
  const firestore = useFirestore();
  
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [messageText, setMessageText] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const vendorsQuery = useMemoFirebase(
    () => superAdmin ? query(collection(firestore, 'vendors')) : null,
    [superAdmin, firestore]
  );
  const { data: vendors, isLoading: areVendorsLoading } = useCollection<Vendor>(vendorsQuery);

  const usersQuery = useMemoFirebase(
    () => selectedVendorId ? query(collection(firestore, 'users'), where('vendorId', '==', selectedVendorId)) : null,
    [firestore, selectedVendorId]
  );
  const { data: users, isLoading: areUsersLoading } = useCollection<EndUser>(usersQuery);

  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !selectedUserId) return null;
    return query(collection(firestore, 'users', selectedUserId, 'messages'), orderBy('timestamp', 'asc'));
  }, [firestore, selectedUserId]);

  const { data: messages, isLoading: messagesLoading } = useCollection<Message>(messagesQuery);
  
  const selectedUser = useMemo(() => users?.find(u => u.id === selectedUserId), [users, selectedUserId]);
  const selectedVendor = useMemo(() => vendors?.find(v => v.id === selectedVendorId), [vendors, selectedVendorId]);

  const handleSendMessage = async () => {
    if ((!messageText && !attachment) || !superAdmin || !selectedUserId) return;

    setIsSending(true);

    const messagesRef = collection(firestore, 'users', selectedUserId, 'messages');

    let attachmentData: Partial<Message> = {};

    if (attachment) {
        try {
            const storage = getStorage();
            const fileRef = storageRef(storage, `users/${selectedUserId}/messages/${Date.now()}_${attachment.name}`);
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
      senderId: superAdmin.uid,
      text: messageText,
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
          setMessageText(e.target.files[0].name); 
      }
  };

  const handleVendorChange = (vendorId: string) => {
    setSelectedVendorId(vendorId);
    setSelectedUserId(null); // Reset user selection when vendor changes
  }

  const isLoading = isSuperAdminLoading || areVendorsLoading;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vendor & User Messages</h1>
        <p className="text-muted-foreground">
          Monitor conversations between vendors and their users.
        </p>
      </div>
      <div className="grid h-[calc(100vh-10rem)] gap-6 md:grid-cols-3">
        <Card className="md:col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
            <div className="space-y-2 pt-2">
              <Select onValueChange={handleVendorChange} value={selectedVendorId || ""}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a Vendor..." />
                </SelectTrigger>
                <SelectContent>
                  {vendors?.map(vendor => (
                    <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {areUsersLoading && selectedVendorId ? <Skeleton className="h-20 w-full" /> : (
            <ul className="divide-y">
              {users?.map((user) => (
                <li
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  className={`p-4 hover:bg-muted/50 cursor-pointer rounded-lg ${selectedUserId === user.id ? 'bg-muted' : ''}`}
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
            {selectedUser && selectedVendor ? (
                <>
                <CardHeader>
                    <CardTitle>Conversation between {selectedVendor.name} and {selectedUser.firstName}</CardTitle>
                </CardHeader>
                <ScrollArea className="flex-1 p-6">
                    <div className="space-y-4">
                    {messagesLoading ? <Skeleton className="h-20 w-full" /> : 
                        messages && messages.length > 0 ? (
                            messages.map((msg) => (
                                <div key={msg.id} className={`flex items-start gap-3 ${msg.senderId === superAdmin?.uid ? 'justify-end' : ''}`}>
                                    {msg.senderId !== superAdmin?.uid && (
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={`https://picsum.photos/seed/${msg.senderId}/32/32`} />
                                            <AvatarFallback>
                                              {msg.senderId === selectedVendorId ? selectedVendor.name?.[0] : selectedUser.firstName?.[0]}
                                            </AvatarFallback>
                                        </Avatar>
                                    )}
                                    <div className={`max-w-xs rounded-lg p-3 text-sm ${msg.senderId === superAdmin?.uid ? 'bg-blue-600 text-white' : 'bg-muted'}`}>
                                        <p className="font-bold mb-1">
                                          {msg.senderId === superAdmin?.uid ? 'You (Super Admin)' : (msg.senderId === selectedVendorId ? selectedVendor.name : selectedUser.firstName)}
                                        </p>
                                        <p>{msg.text}</p>
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
                        ) : (
                            <div className="flex h-full items-center justify-center text-muted-foreground">
                                No messages in this conversation.
                            </div>
                        )
                    }
                    </div>
                </ScrollArea>
                <CardFooter className="border-t p-4">
                    <div className="relative w-full">
                        <Textarea
                        placeholder={attachment ? attachment.name : "Type your message as Super Admin..."}
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
                    <p className="text-muted-foreground">Select a vendor and a user to view their conversation.</p>
                    </div>
                </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
