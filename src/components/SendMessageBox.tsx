// src/components/SendMessageBox.tsx
'use client';

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type SendMessageBoxProps = {
    targetCollectionPath: string;
    senderId: string;
}

export function SendMessageBox({ targetCollectionPath, senderId }: SendMessageBoxProps) {
  const [text, setText] = useState('');
  const firestore = useFirestore();
  const { toast } = useToast();

  const send = async () => {
    if (!text.trim() || !senderId) {
        return;
    }

    try {
      const messagesRef = collection(firestore, targetCollectionPath);
      await addDoc(messagesRef, {
        text: text.trim(),
        senderId: senderId,
        timestamp: serverTimestamp(),
        read: false
      });
      setText('');
    } catch(e: any) {
        console.error("Failed to send message:", e);
        toast({
            variant: "destructive",
            title: "Send Failed",
            description: e.message || "Could not send the message."
        });
    }
  };

  return (
    <div className="p-4 border-t flex gap-2">
      <Input
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && send()}
        placeholder="Type a message..."
      />
      <Button onClick={send}><Send className="h-4 w-4" /></Button>
    </div>
  );
}
