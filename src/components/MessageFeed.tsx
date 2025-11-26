// src/components/MessageFeed.tsx
'use client';

import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { Skeleton } from './ui/skeleton';
import { useEffect, useRef } from 'react';

type Message = {
    id: string;
    senderId: string;
    text: string;
    timestamp: any; // Can be a Date or a Firestore Timestamp
};

type MessageFeedProps = {
    messages: Message[],
    isLoading?: boolean,
    contactName: string,
    contactInitial: string,
    currentUserId?: string | null;
}

export function MessageFeed({ messages, isLoading, contactName, contactInitial, currentUserId }: MessageFeedProps) {
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollAreaRef.current) {
            const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (viewport) {
                viewport.scrollTop = viewport.scrollHeight;
            }
        }
    }, [messages]);
    
    return (
        <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
          <div className="space-y-4">
          {isLoading ? <Skeleton className="h-20 w-full" /> :
            messages && messages.length > 0 ? (
                messages.map((msg) => {
                    const isSender = msg.senderId === currentUserId;
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
