import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Building, User, CheckCircle } from "lucide-react";
import Link from "next/link";

const roles = [
  {
    icon: <ShieldCheck className="h-6 w-6 text-primary" />,
    title: "Super Admin",
    description:
      "Full platform control. Manages vendors, sets pricing, and oversees all system operations.",
    permissions: [
      "Manage all vendors & users",
      "Configure platform-wide settings",
      "Access all financial data",
      "View all support tickets",
    ],
  },
  {
    icon: <Building className="h-6 w-6 text-primary" />,
    title: "Vendor Admin",
    description:
      "Manages a specific vendor's parking lot, users, and branding.",
    permissions: [
      "Manage own users & spots",
      "Handle spot approvals",
      "Customize branding",
      "Contact ParkX support",
    ],
  },
  {
    icon: <User className="h-6 w-6 text-primary" />,
    title: "End User",
    description: "A customer who books and pays for a parking spot.",
    permissions: [
      "Request & manage own spot",
      "View own invoices & make payments",
      "Manage own account details",
      "Message vendor admin",
    ],
  },
];

export default function AccessControlPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Role-Based Access Control (RBAC)
        </h1>
        <p className="text-muted-foreground">
          Platform roles and their core permissions are defined by secure
          backend rules.
        </p>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground p-6">
        <p className="text-sm text-muted-foreground">
          For security and reliability, user permissions are managed by system
          rules and are not editable through this UI. This ensures that access
          levels are consistent and cannot be accidentally changed. For more
          details, see the{" "}
          <Link
            href="#"
            className="text-primary underline-offset-4 hover:underline"
          >
            Firebase Security Rules documentation
          </Link>
          .
        </p>
      </div>

      <div className="space-y-4">
        {roles.map((role) => (
          <Card key={role.title}>
            <CardHeader>
              <div className="flex items-center gap-4">
                {role.icon}
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl">{role.title}</CardTitle>
                  <Badge variant="outline">System Role</Badge>
                </div>
              </div>
              <CardDescription className="pt-2">{role.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <h4 className="mb-2 font-semibold">Core Permissions:</h4>
              <ul className="space-y-2">
                {role.permissions.map((permission) => (
                  <li key={permission} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">
                      {permission}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
