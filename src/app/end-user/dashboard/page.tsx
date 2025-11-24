import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { userInvoices, vendorUserMessages } from "@/lib/data";
import { Car, FileText, MessageCircle, Map } from "lucide-react";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Badge } from "@/components/ui/badge";

const vehicleImage = PlaceHolderImages.find((img) => img.id === 'vehicle-1');

export default function EndUserDashboard() {
  const latestInvoice = userInvoices.find(inv => inv.userName === 'Alice Brown');
  const recentMessages = vendorUserMessages.filter(msg => msg.recipient.includes('Alice Brown')).slice(0, 2);

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Welcome back, Alice!</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My Parking Spot</CardTitle>
            <CardDescription>Your assigned spot and vehicle details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                    <p className="text-sm text-muted-foreground">Assigned Spot</p>
                    <p className="text-2xl font-bold">A1</p>
                </div>
                <Car className="h-8 w-8 text-primary" />
            </div>
             <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                    <p className="text-sm text-muted-foreground">Vehicle</p>
                    <p className="font-semibold">Toyota Camry</p>
                    <p className="text-sm text-muted-foreground">Plate: XYZ-1234</p>
                </div>
                {vehicleImage && (
                    <Image 
                        src={vehicleImage.imageUrl} 
                        alt="My Vehicle" 
                        width={100} 
                        height={75} 
                        className="rounded-md object-cover"
                        data-ai-hint={vehicleImage.imageHint}
                    />
                )}
            </div>
            <Button variant="outline" className="w-full">
                <Map className="mr-2 h-4 w-4" /> View Parking Lot Map
            </Button>
          </CardContent>
        </Card>
        
        <div className="space-y-6">
            <Card>
            <CardHeader>
                <CardTitle>Recent Messages</CardTitle>
                <CardDescription>From your Vendor Admin.</CardDescription>
            </CardHeader>
            <CardContent>
                <ul className="space-y-4">
                {recentMessages.map(msg => (
                    <li key={msg.id} className="flex items-start gap-4">
                        <MessageCircle className="h-5 w-5 text-muted-foreground mt-1" />
                        <div>
                            <p className="text-sm font-medium">{msg.subject}</p>
                            <p className="text-sm text-muted-foreground truncate">{msg.body}</p>
                        </div>
                    </li>
                ))}
                </ul>
            </CardContent>
            </Card>

            <Card>
            <CardHeader>
                <CardTitle>Billing</CardTitle>
                <CardDescription>Your latest invoice.</CardDescription>
            </CardHeader>
            <CardContent>
                {latestInvoice ? (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                        <div>
                            <p className="font-semibold">Invoice #{latestInvoice.id.split('-')[1]}</p>
                            <p className="text-sm text-muted-foreground">Due: {latestInvoice.dueDate}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="font-semibold">${latestInvoice.amount.toFixed(2)}</p>
                        <Badge variant={latestInvoice.status === 'Paid' ? 'default' : 'destructive'}>{latestInvoice.status}</Badge>
                    </div>
                </div>
                ) : (
                <p>No invoices found.</p>
                )}
            </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
