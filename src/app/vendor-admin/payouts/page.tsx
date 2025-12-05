
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreditCard } from "lucide-react";
import { StripeExpressDashboardLink } from '@/components/StripeExpressDashboardLink';

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
        <Card>
            <CardHeader>
                <div className='flex items-center gap-2'>
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>Stripe Express Dashboard</CardTitle>
                </div>
                <CardDescription>
                    Manage your bank details and see your payout history with Stripe. This is required to receive money from your customers.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <StripeExpressDashboardLink />
            </CardContent>
        </Card>
    </div>
  );
}
