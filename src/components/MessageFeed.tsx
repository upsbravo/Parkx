// src/components/MessageFeed.tsx
'use client';

import { useUser } from '@/firebase';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { Skeleton } from './ui/skeleton';

type Message = {
    id: string;
    senderId: string;
    text: string;
    timestamp: any; // Can be a Date or a Firestore Timestamp
};

export function MessageFeed({ messages, isLoading, contactName, contactInitial }: { messages: Message[], isLoading?: boolean, contactName: string, contactInitial: string }) {
    const { user } = useUser();
    
    return (
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-4">
          {isLoading ? <Skeleton className="h-20 w-full" /> :
            messages && messages.length > 0 ? (
                messages.map((msg) => {
                    const isSender = msg.senderId === user?.uid;
                    const timestamp = msg.timestamp?.toDate ? format(msg.timestamp.toDate(), 'p') : '...';

                    return (
                        <div key={msg.id} className={`flex items-start gap-3 ${isSender ? 'justify-end' : ''}`}>
                            {!isSender && (
                                <Avatar className="h-8 w-8">
                                   <AvatarImage src={undefined} />
                                   <AvatarFallback>{contactInitial}</AvatarFallback>
                                </Avatar>
                            )}
                            <div className={`max-w-xs rounded-lg p-3 text-sm ${isSender ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                <p className="font-bold mb-1">{isSender ? 'You' : contactName}</p>
                                <p>{msg.text}</p>
                                <p className="text-xs opacity-70 mt-2 text-right">{timestamp}</p>
                            </div>
                             {isSender && (
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback>ME</AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                    )
                })
            ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                    No messages yet.
                </div>
            )
          }
          </div>
        </ScrollArea>
    );
}
