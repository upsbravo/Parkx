
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { adminVendorMessages } from "@/lib/data";

export default function VendorMessagesPage() {
  return (
    <div className="space-y-4">
       <div>
        <h1 className="text-3xl font-bold tracking-tight">Vendor Messages</h1>
        <p className="text-muted-foreground">
          Review and respond to support requests from vendors.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {adminVendorMessages.map((message) => (
                <li key={message.id} className="p-4 hover:bg-muted/50 cursor-pointer rounded-lg">
                  <div className="flex justify-between items-center">
                      <p className="font-semibold">{message.sender}</p>
                      <time className="text-xs text-muted-foreground">{new Date(message.timestamp).toLocaleDateString()}</time>
                  </div>
                  <p className="text-sm font-medium truncate">{message.subject}</p>
                  <p className="text-sm text-muted-foreground truncate">{message.body}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <div className="md:col-span-2">
          <Card className="h-full">
             <CardContent className="flex h-full items-center justify-center p-6">
                <div className="text-center">
                    <p className="text-muted-foreground">Loading conversations...</p>
                </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
