
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { CreditCard, Edit, Building, HelpCircle } from "lucide-react";
import { StripeExpressDashboardLink } from '@/components/StripeExpressDashboardLink';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { getStripeAccountDetails } from '@/ai/flows/get-stripe-account-status-flow';
import { updateStripeAccountDetails } from '@/ai/flows/update-stripe-account-details-flow';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type Vendor = {
  stripeAccountId?: string;
};

export default function VendorPaymentsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [statementDescriptor, setStatementDescriptor] = useState('');
  const [initialDescriptor, setInitialDescriptor] = useState('');
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const vendorRef = useMemoFirebase(
    () => (user ? doc(firestore, 'vendors', user.uid) : null),
    [user, firestore]
  );
  const { data: vendorData, isLoading: isVendorLoading } = useDoc<Vendor>(vendorRef);

  useEffect(() => {
    async function fetchDetails() {
      if (vendorData?.stripeAccountId) {
        setIsLoadingDetails(true);
        try {
          const details = await getStripeAccountDetails({ stripeAccountId: vendorData.stripeAccountId });
          if (details.statement_descriptor) {
            setStatementDescriptor(details.statement_descriptor);
            setInitialDescriptor(details.statement_descriptor);
          }
        } catch (e) {
          console.error("Failed to fetch stripe details", e);
        } finally {
          setIsLoadingDetails(false);
        }
      }
    }
    fetchDetails();
  }, [vendorData]);

  const handleSaveDescriptor = async () => {
    if (!vendorData?.stripeAccountId || !statementDescriptor) {
      toast({ variant: 'destructive', title: 'Error', description: 'Statement descriptor cannot be empty.'});
      return;
    }
    setIsSaving(true);
    try {
      const result = await updateStripeAccountDetails({
        stripeAccountId: vendorData.stripeAccountId,
        statementDescriptor: statementDescriptor,
      });

      if (result.success) {
        toast({ title: 'Success!', description: 'Your statement descriptor has been updated.' });
        setInitialDescriptor(statementDescriptor);
      } else {
        throw new Error(result.error || 'An unknown error occurred.');
      }
    } catch(e: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
    } finally {
      setIsSaving(false);
    }
  };
  
  const isLoading = isVendorLoading || isLoadingDetails;

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
                  <Edit className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Statement Descriptor</CardTitle>
              </div>
              <CardDescription>
                  This is the text that appears on your customers' credit card statements.
              </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className='space-y-2'>
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-10 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
                <div className='max-w-md space-y-4'>
                    <div className='space-y-2'>
                        <Label htmlFor='statement-descriptor' className='flex items-center gap-1.5'>
                            Shortened Descriptor
                             <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent className='max-w-xs'>
                                    <p>The shortened descriptor is what appears on your customer's bank statements, and is limited by card networks to between 5 and 22 characters.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </Label>
                        <Input 
                          id='statement-descriptor' 
                          value={statementDescriptor}
                          onChange={(e) => setStatementDescriptor(e.target.value)}
                          maxLength={22}
                        />
                    </div>
                    <div className="rounded-md bg-muted p-4">
                      <p className="text-sm font-medium text-muted-foreground">Preview</p>
                      <p className="font-mono text-sm">STRIPE*{statementDescriptor.toUpperCase()}</p>
                    </div>
                </div>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handleSaveDescriptor} disabled={isSaving || statementDescriptor === initialDescriptor}>
              {isSaving ? 'Saving...' : 'Save Descriptor'}
            </Button>
          </CardFooter>
      </Card>
      
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
