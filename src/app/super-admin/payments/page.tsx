import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Banknote, DollarSign } from "lucide-react";

export default function PlatformPaymentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Platform Payment Settings
        </h1>
        <p className="text-muted-foreground">
          Configure Stripe integration and set pricing for your vendors.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            <CardTitle>Stripe Integration</CardTitle>
          </div>
          <CardDescription>
            Enter your Stripe API keys to process payments from vendors. This is
            a global setting for the entire platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stripe-secret">Stripe Secret Key</Label>
            <Input
              id="stripe-secret"
              type="password"
              defaultValue="sk_test_************************"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            <CardTitle>Default Pricing Model</CardTitle>
          </div>
          <CardDescription>
            Set the default monthly subscription price for new vendors and the
            cost for each additional parking spot. This can be overridden per
            vendor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="base-price">Base Monthly Price</Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  $
                </span>
                <Input
                  id="base-price"
                  type="number"
                  defaultValue="250"
                  className="pl-7"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="spot-price">Price Per Extra Spot (Monthly)</Label>
               <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  $
                </span>
                <Input
                  id="spot-price"
                  type="number"
                  defaultValue="10"
                  className="pl-7"
                />
              </div>
            </div>
          </div>
           <Button>Save Pricing</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            <CardTitle>Platform Payout Account</CardTitle>
          </div>
          <CardDescription>
            This is the bank account where your platform earnings from all
            vendor subscriptions will be sent.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="holder-name">Account Holder Name</Label>
              <Input id="holder-name" defaultValue="ParkX Inc." />
            </div>
             <div className="space-y-2">
              <Label htmlFor="routing-number">Routing Number</Label>
              <Input id="routing-number" defaultValue="123456789" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-number">Account Number</Label>
            <Input
              id="account-number"
              type="password"
              defaultValue="************1234"
            />
          </div>
          <Button>Save Payout Account</Button>
        </CardContent>
      </Card>
    </div>
  );
}
