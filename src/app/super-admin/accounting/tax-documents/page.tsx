
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


export default function TaxDocumentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tax Documents</h1>
        <p className="text-muted-foreground">
          Access and manage tax forms for your platform and connected accounts.
        </p>
      </div>

       <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Important Tax Information</AlertTitle>
        <AlertDescription>
            ParkX utilizes Stripe to generate and deliver tax forms, such as 1099s, to your connected accounts (vendors). Stripe is the official record for all tax-related documentation. Ensure your account details on Stripe are always up-to-date.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Manage Tax Forms on Stripe</CardTitle>
          </div>
          <CardDescription>
            Stripe provides a secure dashboard for you to view, manage, and download tax forms for your vendors. This ensures compliance and simplifies your end-of-year accounting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm mb-4">
            By clicking the button below, you will be securely redirected to your Stripe dashboard to manage tax information. This is where you can:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground mb-6">
            <li>View and download 1099 tax forms for your vendors.</li>
            <li>Confirm vendor tax information (TIN).</li>
            <li>Manage e-delivery settings for tax documents.</li>
          </ul>
          <Button asChild>
            <Link href="https://dashboard.stripe.com/tax/forms" target="_blank" rel="noopener noreferrer">
                Go to Stripe Tax Dashboard
                <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
