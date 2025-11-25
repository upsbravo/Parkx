
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
import { Send, Headset } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function VendorSupportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contact Support</h1>
        <p className="text-muted-foreground">
          Send a message to the ParkX support team for platform-level issues or
          questions.
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
        <CardContent className="flex-1 space-y-6 overflow-y-auto p-6">
          <div className="flex items-start gap-4">
            <Avatar>
              <AvatarFallback>SA</AvatarFallback>
            </Avatar>
            <div className="grid gap-1 rounded-lg bg-muted p-3 text-sm">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="flex items-start justify-end gap-4">
            <div className="grid gap-1 rounded-lg bg-primary p-3 text-sm text-primary-foreground">
              <Skeleton className="h-4 w-40 bg-primary/50" />
            </div>
            <Avatar>
              <AvatarFallback>VA</AvatarFallback>
            </Avatar>
          </div>
        </CardContent>
        <CardFooter className="border-t p-4">
          <div className="relative w-full">
            <Textarea
              placeholder="Type your message..."
              className="pr-16"
              rows={1}
            />
            <Button
              type="submit"
              size="icon"
              className="absolute right-2.5 top-1/2 -translate-y-1/2"
            >
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
