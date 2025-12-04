import type { ReactNode } from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/logo";
import { Toaster } from "@/components/ui/toaster";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import Link from "next/link";
import { LogOut, Settings, ShieldCheck } from "lucide-react";
import { Notifications } from "./notifications";
import { SuperAdminNotifications } from "./SuperAdminNotifications";
import { VendorAdminNotifications } from "./VendorAdminNotifications";

export default function DashboardLayout({
  children,
  nav,
  role = "User",
  vendorLogo,
  vendorName,
}: {
  children: ReactNode;
  nav: ReactNode;
  role?: string;
  vendorLogo?: string | null;
  vendorName?: string | null;
}) {
  let accountPageUrl = "/end-user/account";
  if (role === "Super Admin") {
    accountPageUrl = "/super-admin/account";
  } else if (role === "Vendor Admin") {
    accountPageUrl = "/vendor-admin/account";
  }


  return (
    <SidebarProvider>
      <div className="min-h-screen w-full bg-background">
        <Sidebar>
          <SidebarHeader>
            <Logo
              logoUrl={role === "End User" && vendorLogo ? vendorLogo : undefined}
              name={role === "End User" && vendorName ? vendorName : undefined}
            />
          </SidebarHeader>
          {nav}
          <SidebarFooter>
             <SidebarMenu>
               <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Logout">
                    <Link href="/login">
                      <LogOut />
                      <span>Logout</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
             </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="flex h-14 items-center gap-4 border-b bg-card px-6 sticky top-0 z-30">
            <SidebarTrigger className="md:hidden" />
            <div className="flex-1">
              {/* Future search bar or breadcrumbs can go here */}
            </div>
            <div className="flex items-center gap-2">
              {role === 'End User' && <Notifications />}
              {role === 'Super Admin' && <SuperAdminNotifications />}
              {role === 'Vendor Admin' && <VendorAdminNotifications />}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="overflow-hidden rounded-full"
                  >
                    {role === 'Super Admin' ? (
                       <Avatar>
                          <AvatarFallback>
                            <ShieldCheck className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                    ) : (
                      <Avatar>
                        <AvatarImage src="https://picsum.photos/seed/avatar/100/100" alt="User avatar" />
                        <AvatarFallback>{role.charAt(0)}</AvatarFallback>
                      </Avatar>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{role} Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={accountPageUrl}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/login">
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="p-4 md:p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}
