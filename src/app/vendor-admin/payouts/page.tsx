
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard } from "lucide-react";
import StripeOnboarding from '@/components/StripeOnboarding';

export default function VendorPaymentsPage() {

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Payments & Payouts
        </h1>
        <p className="text-muted-foreground">
          Manage your payments, payouts, and billing settings.
        </p>
      </div>

      <Tabs defaultValue="account">
        <TabsList>
          <TabsTrigger value="account">Account & Payouts</TabsTrigger>
          <TabsTrigger value="transactions" disabled>Transactions</TabsTrigger>
          <TabsTrigger value="readers" disabled>Readers</TabsTrigger>
          <TabsTrigger value="ach" disabled>ACH</TabsTrigger>
          <TabsTrigger value="bnpl" disabled>Buy Now Pay Later</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="mt-6">
          <Card>
            <CardHeader>
                <div className='flex items-center gap-2'>
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>Stripe Account</CardTitle>
                </div>
                <CardDescription>
                    Manage your Stripe account and update your bank details for payouts. This is required to receive money from your customers.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <StripeOnboarding />
            </CardContent>
        </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
