
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
          Manage your payout bank account and view your payout history from
          ParkX.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payout Bank Account</CardTitle>
          <CardDescription>
            Connect your bank account to receive payouts from user payments.
            This information is securely stored.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="holder-name">Account Holder Name</Label>
              <Input id="holder-name" defaultValue="John Doe" />
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
        </CardContent>
        <CardFooter>
          <Button>Save Payout Account</Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
          <CardDescription>
            History of payouts sent from ParkX to your connected bank account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Gross Amount</TableHead>
                <TableHead>Stripe Fees</TableHead>
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

