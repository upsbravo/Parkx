

'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser, useDoc, useFirestore, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { createStripeCheckout } from '@/ai/flows/create-stripe-checkout-flow';
import { Switch } from '@/components/ui/switch';

type Vendor = {
  id: string;
  name: string;
  spotLimit: number;
  stripeCustomerId?: string;
  trialOffered?: boolean;
  address?: {
    street1?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
};

const getAgreementText = (vendor: Vendor | null) => {
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const vendorName = vendor?.name || '[Vendor Legal Business Name]';
    const vendorAddress = vendor?.address ? `${vendor.address.street1}, ${vendor.address.city}, ${vendor.address.state} ${vendor.address.zip}` : '[Vendor Address]';


    return `
PARKX VENDOR MASTER SERVICES AGREEMENT
Effective Date: ${today}

This is a legally binding agreement between ParkX Technologies LLC ("ParkX", "we") and ${vendorName} ("Vendor", "you").
Your address on file is: ${vendorAddress}

By clicking "I Accept & Begin Trial" you agree to all terms below:

1. Service
ParkX provides software that lets you list truck parking spaces and collect rent from tenants. ParkX is NOT the owner, landlord, or operator of any parking lot.

2. Zero Liability
ParkX has NO LIABILITY for theft, damage, injury, tenant disputes, non-payment, zoning violations, weather events, or anything else that happens on your property. You assume 100% of all risk.

3. Platform Fees (November 2025)
• Base fee: $249 per month (includes first 20 parking spaces)
• Each additional space: $10 per month
• Charged automatically on the 1st of every month via Stripe
• No refunds or proration

4. Payment Processing
Tenant rent is collected via Stripe Connect. ParkX deducts the monthly platform fee first, then pays the rest to your bank account automatically.

5. Your Responsibilities
• Carry at least $1,000,000 commercial liability insurance
• Comply with all laws
• Honor every lease created through ParkX
• Keep your lot info accurate
• Defend and pay ParkX if anyone sues us because of your lot

6. Termination
Either party can end this with 30 days notice. ParkX can suspend or terminate immediately for non-payment or breach.

7. Indemnification & Limitation of Liability
You indemnify and defend ParkX from all claims. ParkX’s total liability is capped at the last 3 months of fees you paid.

8. Governing Law
Texas law. Arbitration in Houston, Texas.

9. Electronic Signature
By clicking “I Accept & Begin Trial” you provide a legally binding signature under the ESIGN Act.
`;
};

export default function MasterAgreementPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [signerName, setSignerName] = useState('');
  const [signerTitle, setSignerTitle] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToCharge, setAgreedToCharge] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const vendorDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'vendors', user.uid) : null),
    [user, firestore]
  );
  const { data: vendorData, isLoading: isVendorLoading } = useDoc<Vendor>(vendorDocRef);

  const extraSpaces = Math.max(0, (vendorData?.spotLimit || 0) - 20);
  const extraSpacesCost = extraSpaces * 10;
  const totalMonthlyFee = 249 + extraSpacesCost;

  const handleSubmit = async () => {
    if (!user || !vendorData || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Vendor data not found.' });
      return;
    }
    if (!signerName || !signerTitle) {
      toast({ variant: 'destructive', title: 'Missing Information', description: 'Please enter your name and title.' });
      return;
    }
     if (!vendorData.stripeCustomerId) {
      toast({ variant: 'destructive', title: 'Stripe Account Error', description: 'Your Stripe customer account is not yet set up. Please contact support.' });
      return;
    }

    setIsSubmitting(true);
    
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const signedAgreementText = `
${getAgreementText(vendorData)}

ACCEPTANCE
I have authority to bind the company and agree to all terms.

Legal Business Name: ${vendorData.name}
Signer Name & Title: ${signerName}, ${signerTitle}
Date: ${today}
Electronic Signature: /s/ ${signerName} (Captured on click)

ParkX Technologies LLC – Auto-signed
    `;
    
    const docsRef = collection(firestore, 'vendors', user.uid, 'vendorDocuments');
    addDocumentNonBlocking(docsRef, {
        vendorId: user.uid,
        name: `Signed Master Services Agreement - ${today}`,
        content: signedAgreementText,
        createdAt: new Date().toISOString(),
    });
    
    toast({
        title: 'Agreement Signed!',
        description: "Redirecting to subscription setup...",
    });

    try {
        const checkoutInput: any = {
            customer: vendorData.stripeCustomerId,
            line_items: [
                { price: 'price_1SYZdJFOrzQHr7JwTcv4khnz', quantity: 1 },
                ...(extraSpaces > 0 ? [{ price: 'price_1SYZeTFOrzQHr7Jw6MFDflI4', quantity: extraSpaces }] : [])
            ],
            mode: 'subscription',
            successUrl: `${window.location.origin}/vendor-admin/stripe-onboarding`,
            cancelUrl: window.location.origin + pathname,
            metadata: {
                uid: user.uid, // Pass the vendor's UID for the webhook
            }
        };

        // Check if the vendor was offered a trial
        if (vendorData.trialOffered) {
            checkoutInput.subscription_data = {
                trial_period_days: 30,
            };
        }

        const result = await createStripeCheckout(checkoutInput);

        if (result.url) {
             const trialEndDate = vendorData.trialOffered ? new Date() : null;
             if (trialEndDate) {
                trialEndDate.setDate(trialEndDate.getDate() + 30);
             }
             
             await updateDocumentNonBlocking(vendorDocRef!, {
                status: vendorData.trialOffered ? 'Trial' : 'Active', // Set status based on trial
                agreementSigned: true,
                agreementSignedDate: new Date().toISOString(),
                trialEnds: trialEndDate ? trialEndDate.toISOString() : null,
            });
            window.location.assign(result.url);
        } else {
            throw new Error(result.error || "Failed to get checkout URL from backend.");
        }

    } catch (e: any) {
        console.error("Error creating checkout session:", e);
        toast({
            variant: "destructive",
            title: "Payment Setup Failed",
            description: e.message || "Could not redirect to payment page. Please contact support.",
        });
        setIsSubmitting(false);
    }
  };

  const isLoading = isUserLoading || isVendorLoading;
  const canSubmit = signerName && signerTitle && agreedToTerms && agreedToCharge && !isLoading && !isSubmitting;
  const wasTrialOffered = vendorData?.trialOffered !== false; // Default to true if undefined

  return (
    <div className="flex flex-col items-center justify-center p-4 md:p-6 bg-muted min-h-screen">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="text-2xl">Final Step: Master Services Agreement</CardTitle>
          <CardDescription>
            Please read and sign the following agreement to activate your ParkX account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96 w-full rounded-md border p-4">
            {isLoading ? (
                <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
            ) : (
                <pre className="whitespace-pre-wrap text-sm font-sans">
                    {getAgreementText(vendorData)}
                </pre>
            )}
          </ScrollArea>
        </CardContent>
        <CardFooter className="flex flex-col gap-6 items-start">
            <div className="w-full space-y-4 rounded-lg border p-4">
                <h3 className="font-semibold">Your Subscription Plan</h3>
                <Separator />
                <div className="flex justify-between text-sm"><p>Base Fee (up to 20 spaces)</p> <p>$249.00 / month</p></div>
                {extraSpaces > 0 && (
                    <div className="flex justify-between text-sm"><p>{extraSpaces} Additional Spaces × $10.00</p> <p>${extraSpacesCost.toFixed(2)} / month</p></div>
                )}
                <Separator />
                <div className="flex justify-between font-bold"><p>Total Monthly Fee</p> <p>${totalMonthlyFee.toFixed(2)}</p></div>
                 
                 {wasTrialOffered && (
                    <p className="text-sm text-green-600 font-medium pt-2">A 30-day free trial will be applied. You will not be charged until your trial ends.</p>
                 )}
            </div>

            <div className="w-full grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="signer-name">Signer Full Name</Label>
                    <Input id="signer-name" placeholder="John Doe" value={signerName} onChange={(e) => setSignerName(e.target.value)} disabled={isLoading} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="signer-title">Signer Title</Label>
                    <Input id="signer-title" placeholder="Owner, CEO, etc." value={signerTitle} onChange={(e) => setSignerTitle(e.target.value)} disabled={isLoading} />
                </div>
            </div>
            <div className="space-y-3">
                <div className="flex items-start space-x-3">
                    <Checkbox id="terms" checked={agreedToTerms} onCheckedChange={(checked) => setAgreedToTerms(Boolean(checked))} disabled={isLoading} className="mt-1"/>
                    <Label htmlFor="terms" className="text-sm font-normal leading-snug">
                    I agree to the ParkX Vendor Master Services Agreement.
                    </Label>
                </div>
                <div className="flex items-start space-x-3">
                    <Checkbox id="charge" checked={agreedToCharge} onCheckedChange={(checked) => setAgreedToCharge(Boolean(checked))} disabled={isLoading} className="mt-1"/>
                    <Label htmlFor="charge" className="text-sm font-normal leading-snug">
                    I authorize ParkX to save my payment method and charge me monthly according to the terms above.
                    </Label>
                </div>
            </div>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full" size="lg">
            {isSubmitting ? 'Finalizing...' : `I Accept & Continue to Payment`}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

