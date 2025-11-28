
'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DollarSign,
  CreditCard,
  Landmark,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Smartphone,
  BookUser,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';

export default function VendorPaymentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground">
            Manage your payments, payouts, and billing settings.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Active</div>
            <p className="text-xs text-muted-foreground">
              You can accept online payments.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payouts</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Enabled</div>
            <p className="text-xs text-muted-foreground">
              Payouts are sent to your bank account.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In-Person Payments</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Not Active</div>
            <p className="text-xs text-muted-foreground">
              Contact support to enable readers.
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="account">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="transactions" asChild>
             <Link href="/vendor-admin/transactions">Transactions</Link>
          </TabsTrigger>
          <TabsTrigger value="payouts" disabled>Payouts</TabsTrigger>
          <TabsTrigger value="readers" disabled>Readers</TabsTrigger>
          <TabsTrigger value="ach" disabled>ACH</TabsTrigger>
          <TabsTrigger value="bnpl" disabled>Buy Now Pay Later</TabsTrigger>
        </TabsList>
        <TabsContent value="account" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <div className='flex items-center gap-2'>
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                        <CardTitle>Stripe Account</CardTitle>
                    </div>
                    <CardDescription>
                        Manage your Stripe account and view your connected account details.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex items-center justify-between rounded-lg border bg-card p-4">
                        <div>
                            <p className="text-sm font-medium">Acme Parking Inc.</p>
                            <p className="text-sm text-muted-foreground">acct_123...xyz</p>
                        </div>
                        <Badge variant="default">Enabled</Badge>
                    </div>
                     <p className='text-sm text-muted-foreground'>ParkX uses Stripe to process payments from your customers. You are in complete control of your funds.</p>
                </CardContent>
                <CardFooter>
                     <Button variant="outline">
                        Manage on Stripe <ExternalLink className='ml-2 h-4 w-4'/>
                    </Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                     <div className='flex items-center gap-2'>
                        <DollarSign className="h-5 w-5 text-muted-foreground" />
                        <CardTitle>Rates & Fees</CardTitle>
                    </div>
                    <CardDescription>
                       The fees applied to each transaction.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                   <div className="flex justify-between items-center text-sm">
                        <p className="text-muted-foreground">ParkX Platform Fee</p>
                        <p className="font-medium">10%</p>
                   </div>
                    <div className="flex justify-between items-center text-sm">
                        <p className="text-muted-foreground">Stripe Processing Fee</p>
                        <p className="font-medium">~2.9% + 30¢</p>
                   </div>
                    <Separator/>
                     <div className="flex justify-between items-center text-sm font-semibold">
                        <p>You Receive (approx.)</p>
                        <p>~87.1%</p>
                   </div>
                </CardContent>
                 <CardFooter className="flex-col items-start gap-2 text-xs text-muted-foreground">
                    <p>The Stripe processing fee is an estimate and may vary.</p>
                    <p>ParkX platform fees are deducted automatically from each transaction.</p>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                     <div className='flex items-center gap-2'>
                        <Landmark className="h-5 w-5 text-muted-foreground" />
                        <CardTitle>Payouts</CardTitle>
                    </div>
                    <CardDescription>
                       Your payout schedule and connected bank account.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                        <p className="text-muted-foreground">Payout Schedule</p>
                        <p className="font-medium">Daily</p>
                   </div>
                    <div className="flex justify-between items-center text-sm">
                        <p className="text-muted-foreground">Payout Account</p>
                        <p className="font-medium flex items-center gap-2">Chase Bank <span className='font-mono'>••••1234</span></p>
                   </div>
                </CardContent>
                 <CardFooter className="flex-col items-start gap-2 text-xs text-muted-foreground">
                   <p>Payouts are managed through your Stripe Express dashboard.</p>
                </CardFooter>
            </Card>

             <Card>
                <CardHeader>
                     <div className='flex items-center gap-2'>
                        <BookUser className="h-5 w-5 text-muted-foreground" />
                        <CardTitle>Statement Descriptor</CardTitle>
                    </div>
                    <CardDescription>
                       How charges will appear on your customers' bank statements.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="flex items-center justify-between rounded-lg border bg-card p-4">
                        <div>
                            <p className="text-sm font-medium">ACME PARKING</p>
                            <p className="text-sm text-muted-foreground">acmeparking.com</p>
                        </div>
                    </div>
                </CardContent>
                  <CardFooter className="flex-col items-start gap-2 text-xs text-muted-foreground">
                   <p>This helps customers recognize their payments to you.</p>
                </CardFooter>
            </Card>

          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
