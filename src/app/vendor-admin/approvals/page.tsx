
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight } from 'lucide-react';

export default function ApprovalsPage() {
  const pendingCancellations = [
    {
      user: {
        name: 'Alice Brown',
        avatar: 'https://picsum.photos/seed/avatar1/40/40',
      },
      spot: 'A-12',
      date: '2023-12-01',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Approvals</h1>
        <p className="text-muted-foreground">
          Approve or deny pending requests from users.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Pending Cancellations</CardTitle>
          </div>
          <CardDescription>
            Review requests from users to vacate their spots.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Spot(s) to Vacate</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {true ? (
                 <TableRow>
                  <TableCell>
                     <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-1">
                           <Skeleton className="h-4 w-24" />
                           <Skeleton className="h-3 w-32" />
                        </div>
                     </div>
                  </TableCell>
                  <TableCell>
                     <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell>
                     <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                     <Skeleton className="h-8 w-20 inline-block" />
                     <Skeleton className="h-8 w-20 inline-block" />
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No pending cancellation requests.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
