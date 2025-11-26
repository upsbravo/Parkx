'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

type EndUser = {
  id: string;
  vendorId: string;
  firstName: string;
  lastName: string;
  truckCompanyName?: string;
  address?: { street?: string; city?: string; state?: string; zip?: string; };
  vehicleYear?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  licensePlate?: string;
  trailerPlate?: string;
};

type Vendor = {
  name: string;
  address?: {
    street1?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
};

const getAgreementText = (vendor: Vendor | null, user: EndUser | null) => {
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const vendorName = vendor?.name || '[Your Company Name]';
    const vendorAddress = `${vendor?.address?.street1 || '[Vendor Street]'}, ${vendor?.address?.city || '[Vendor City]'}, ${vendor?.address?.state || '[Vendor State]'} ${vendor?.address?.zip || '[Vendor Zip]'}`.trim();
    const userName = user?.truckCompanyName || `${user?.firstName || ''} ${user?.lastName || ''}`;
    const userAddress = `${user?.address?.street || ''}, ${user?.address?.city || ''}, ${user?.address?.state || ''} ${user?.address?.zip || ''}`.trim();
    const vehicleInfo = `${user?.vehicleYear || ''} ${user?.vehicleMake || ''} ${user?.vehicleModel || ''}`.trim();

    return `
PARKING AUTHORIZATION AND LIABILITY WAIVER AGREEMENT
(Virginia – Private Property)

This Parking Authorization and Liability Waiver Agreement (“Agreement”) is entered into on ${today}, between:

Property Owner/Operator:
${vendorName}
Address: ${vendorAddress}
(“Property Owner”)

and

Parking User:
${userName}
Address: ${userAddress || '______________________________________________'}
Vehicle: ${vehicleInfo || '_______________ [Year/Make/Model]'}
License Plate: ${user?.licensePlate || '_______________'}   Trailer Plate (if any): ${user?.trailerPlate || '_______________'}
(“User”)

1. Authorization to Park
Property Owner hereby grants User a revocable, non-exclusive license to park the above-described vehicle on the private property located at ${vendorAddress} from at will until revoked.

2. No Bailment Created
User acknowledges that no bailment is created and Property Owner is not providing a parking service. Property Owner is merely granting permission to use the space. Property Owner has no duty to guard, protect, or insure the vehicle or its contents.

3. Waiver and Release of Liability
User, for themselves and on behalf of their employees, agents, insurers, and assigns, hereby releases, waives, and forever discharges Property Owner and its officers, employees, and agents from any and all liability, claims, demands, or causes of action arising from theft, vandalism, fire, collision, weather damage, towing, or any other loss or damage to the vehicle or its contents while parked on the property, regardless of cause or fault.

4. Indemnification
User agrees to indemnify, defend, and hold harmless Property Owner from any claims, damages, or expenses (including reasonable attorney fees) arising from User’s use of the property or any act or omission of User or User’s drivers.

5. Rules
User agrees to park only in designated areas, not block driveways or fire lanes, and remove the vehicle immediately upon request. Unauthorized or abandoned vehicles may be towed at User’s expense under Virginia Code § 46.2-1224.

6. Revocation
This authorization may be revoked by Property Owner at any time with or without cause upon verbal or written notice.

7. Governing Law
This Agreement shall be governed by the laws of the Commonwealth of Virginia.

IN WITNESS WHEREOF, the parties have executed this Agreement on the date first written above.
`;
};


export default function WaiverPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [signature, setSignature] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userData, isLoading: isUserDocLoading } = useDoc<EndUser>(userDocRef);

  const vendorDocRef = useMemoFirebase(
    () => (firestore && userData ? doc(firestore, 'vendors', userData.vendorId) : null),
    [firestore, userData]
  );
  const { data: vendorData, isLoading: isVendorLoading } = useDoc<Vendor>(vendorDocRef);

  const handleSubmit = async () => {
    if (!user || !userData || !vendorData) {
      toast({ variant: 'destructive', title: 'Error', description: 'User or vendor data not found.' });
      return;
    }
    setIsSubmitting(true);
    
    const signedAgreementText = `
${getAgreementText(vendorData, userData)}

PROPERTY OWNER:
Signature: /s/ ${vendorData.name} (electronically)
Printed Name & Title: ${vendorData.name}
Date: ${new Date().toLocaleDateString()}

PARKING USER:
Signature: /s/ ${signature} (electronically)
Printed Name & Title: ${signature}
Date: ${new Date().toLocaleDateString()}
    `;


    try {
        const userRef = doc(firestore, 'users', user.uid);
        const docsRef = collection(firestore, 'vendors', userData.vendorId, 'userDocuments');

        // Update user profile
        updateDocumentNonBlocking(userRef, {
            waiverSigned: true,
            waiverSignedDate: new Date().toISOString()
        });

        // Add the document
        addDocumentNonBlocking(docsRef, {
            userId: user.uid,
            vendorId: userData.vendorId,
            name: "Signed Parking Agreement",
            content: signedAgreementText,
            createdAt: new Date().toISOString()
        });
      
        toast({
            title: 'Agreement Signed',
            description: 'Thank you! You can now access your dashboard.',
        });
        router.push('/end-user/dashboard');
    } catch (error) {
        console.error("Failed to save waiver:", error);
        toast({
            variant: 'destructive',
            title: 'Submission Failed',
            description: 'Could not save your signature. Please try again.'
        });
        setIsSubmitting(false);
    }
  };

  const isLoading = isUserLoading || isUserDocLoading || isVendorLoading;
  const canSubmit = signature.trim() !== '' && agreed && !isLoading && !isSubmitting;
  const fullName = `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim();


  return (
    <div className="flex flex-col items-center justify-center p-4 md:p-6">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="text-2xl">Parking Agreement & Liability Waiver</CardTitle>
          <CardDescription>
            Please read the following agreement carefully. You must sign and agree to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-80 w-full rounded-md border p-4">
            {isLoading ? (
                <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
            ) : (
                <pre className="whitespace-pre-wrap text-sm font-sans">
                    {getAgreementText(vendorData, userData)}
                </pre>
            )}
          </ScrollArea>
        </CardContent>
        <CardFooter className="flex flex-col gap-6 items-start">
            <div className="w-full space-y-2">
                <Label htmlFor="signature">Your Signature</Label>
                <p className="text-xs text-muted-foreground">Type your full name to electronically sign this document.</p>
                <Input 
                    id="signature" 
                    placeholder={fullName || "Your Full Name"}
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    disabled={isLoading}
                />
            </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="terms" checked={agreed} onCheckedChange={(checked) => setAgreed(Boolean(checked))} disabled={isLoading} />
            <label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              I have read and agree to the terms and conditions of this agreement.
            </label>
          </div>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full">
            {isSubmitting ? 'Submitting...' : 'Agree & Submit'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

    