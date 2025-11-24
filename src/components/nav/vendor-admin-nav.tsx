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
  MessageCircle,
  Palette,
  Banknote,
} from "lucide-react";

const navItems = [
  { href: "/vendor-admin/dashboard", icon: <LayoutDashboard />, label: "Dashboard" },
  { href: "/vendor-admin/users", icon: <Users />, label: "Users" },
  { href: "/vendor-admin/parking-lot", icon: <ParkingSquare />, label: "Parking Lot" },
  { href: "/vendor-admin/requests", icon: <ClipboardList />, label: "Requests" },
  { href: "/vendor-admin/messages", icon: <MessageCircle />, label: "Messages" },
  { href: "/vendor-admin/branding", icon: <Palette />, label: "Branding" },
  { href: "/vendor-admin/billing", icon: <Banknote />, label: "Billing & Payouts" },
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
              isActive={pathname === item.href}
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
