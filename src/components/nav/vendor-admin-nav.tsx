"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  ParkingSquare,
  ClipboardList,
  Palette,
  Banknote,
  BadgeCheck,
  Settings,
  MessageCircle,
  FileText,
  LifeBuoy
} from "lucide-react";

const navItems = [
  { href: "/vendor-admin/dashboard", icon: <LayoutDashboard />, label: "Dashboard" },
  { href: "/vendor-admin/users", icon: <Users />, label: "User Management" },
  { href: "/vendor-admin/parking-lot", icon: <ParkingSquare />, label: "Parking Lot" },
  { href: "/vendor-admin/approvals", icon: <BadgeCheck />, label: "Approvals" },
  { href: "/vendor-admin/user-invoices", icon: <FileText />, label: "User Invoices" },
  { href: "/vendor-admin/messages", icon: <MessageCircle />, label: "User Messages" },
  { href: "/vendor-admin/invoices", icon: <ClipboardList />, label: "My Invoices" },
  { href: "/vendor-admin/branding", icon: <Palette />, label: "Branding" },
  { href: "/vendor-admin/support", icon: <LifeBuoy />, label: "My Support" },
  { href: "/vendor-admin/payouts", icon: <Banknote />, label: "Payouts" },
  { href: "/vendor-admin/account", icon: <Settings />, label: "Account" },
];

export default function VendorAdminNav() {
  const pathname = usePathname();

  return (
    <SidebarContent>
      <SidebarMenu>
        {navItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={pathname.startsWith(item.href)}
              tooltip={item.label}
            >
              <Link href={item.href}>
                {item.icon}
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarContent>
  );
}
