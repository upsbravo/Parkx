
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Payout, payouts } from '@/lib/data';
import { ExternalLink } from 'lucide-react';

export default function PayoutsPage() {
  const statusVariant = {
    Completed: 'default',
    'In Transit': 'secondary',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Payment & Payout Settings
        </h1>
        <p className="text-muted-foreground">
          Connect your Stripe account to receive payments from your users.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Receive Payments from Your Users</CardTitle>
          <CardDescription>
            To charge your users for parking, you must connect your own Stripe
            account to the ParkX platform. This allows you to securely manage
            payments and receive direct payouts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex w-full flex-col items-start gap-4 rounded-lg border p-6">
            <div className="flex items-center gap-4">
              <svg
                role="img"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10"
              >
                <title>Stripe</title>
                <path
                  d="M19.349 8.182h-2.924c.484-.814.86-1.637.896-2.436h3.468c-.144.823-.48 1.637-.94 2.436Zm-.679 3.551c0-.284.024-.56.06-.828h-3.904a10.428 10.428 0 0 0-.06.828c0 .264.024.52.06.776h3.904c-.036-.256-.06-.512-.06-.776Zm-4.572-1.22c.1-.815.168-1.638.168-2.46h-3.48c.012.822.06 1.645.168 2.46h3.144Zm-1.896 2.048c-.084-.52-.132-1.048-.132-1.592s.048-1.072.132-1.592h-2.616c-.084.52-.132 1.048-.132 1.592s.048 1.072.132 1.592h2.616Zm-3.132-2.048c.108-.815.156-1.638.168-2.46H5.448c.012.822.06 1.645.168 2.46h3.12Zm-.552 4.34c.036-.264.06-.52.06-.784s-.024-.52-.06-.784H4.332c-.084.52-.132 1.048-.132 1.592s.048 1.072.132 1.592h3.336c.036-.264.06-.536.06-.816Zm1.896 1.624c.084.52.132 1.048.132 1.592a15.86 15.86 0 0 1-.132 1.592h2.616c.084-.52.132-1.048.132-1.592s-.048-1.072-.132-1.592h-2.616Zm3.132-1.624c.108.823.156 1.645.168 2.46h3.48c-.012-.815-.06-1.637-.168-2.46H13.6Zm.564 4.34c-.036.264-.06.536-.06.816s.024.52.06.784h3.336c.084-.52.132-1.048.132-1-5.92s-.048-1.072-.132-1.592H14.164Zm5.185-2.072c.48.8.816 1.613.94 2.436h-3.468c-.036-.8-.412-1-6.23-.896-2.436h2.924Zm-16.732 0c.528 0 .972.336 1.152.792h1.56c-.192-.936-.924-1.62-1.848-1.62-.264 0-.516.06-.744.156a2.23 2.23 0 0 0-.852-.156c-1.284 0-2.316 1.032-2.316 2.316s1.032 2.316 2.316 2.316c.3 0 .588-.06.852-.156.228.096.48.156.744.156.924 0 1.656-.684 1.848-1.62h-1.56c-.18.456-.624.792-1.152.792-.528 0-.972-.336-1.152-.792h-.036v.636H0V9.818h2.62Zm21.379.036c.456 0 .828.372.828.828s-.372.828-.828.828h-2.1v1.548h-1.632V9.854h3.732Zm-1.631 1.296h.792v-.468h-.792v.468Z"
                  fill="currentColor"
                />
              </svg>
              <div>
                <h3 className="font-semibold">Connect with Stripe</h3>
                <p className="text-sm text-muted-foreground">
                  ParkX uses Stripe Connect to handle payments securely.
                </p>
              </div>
            </div>
            <Button className="w-full sm:w-auto">
              Connect with Stripe
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            By connecting your Stripe account, you agree to the Stripe
            Connected Account Agreement. ParkX does not store your financial
            details.
          </p>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
          <CardDescription>
            History of payouts sent from Stripe to your connected bank account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Gross Amount</TableHead>
                <TableHead>Fees (Stripe + ParkX)</TableHead>
                <TableHead>Net Payout</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.map((payout) => (
                <TableRow key={payout.date}>
                  <TableCell>{payout.date}</TableCell>
                  <TableCell>${payout.grossAmount.toFixed(2)}</TableCell>
                  <TableCell className="text-red-500">
                    -${payout.stripeFees.toFixed(2)}
                  </TableCell>
                  <TableCell className="font-semibold">
                    ${payout.netPayout.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        statusVariant[payout.status] as
                          | 'default'
                          | 'secondary'
                      }
                    >
                      {payout.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
