
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
  Building,
  FileText,
  MessageSquare,
  CreditCard,
  ShieldCheck,
  Settings,
  BadgeCheck,
} from "lucide-react";

const navItems = [
  { href: "/super-admin/dashboard", icon: <LayoutDashboard />, label: "Dashboard" },
  { href: "/super-admin/vendors", icon: <Building />, label: "Vendor Management" },
  { href: "/super-admin/approvals", icon: <BadgeCheck />, label: "Approvals" },
  { href: "/super-admin/invoices", icon: <FileText />, label: "All Invoices" },
  { href: "/super-admin/payments", icon: <CreditCard />, label: "Platform Payments" },
  { href: "/super-admin/messages", icon: <MessageSquare />, label: "Vendor Tickets" },
  { href: "/super-admin/access-control", icon: <ShieldCheck />, label: "Access Control" },
  { href: "/super-admin/account", icon: <Settings />, label: "Account" },
];

export default function SuperAdminNav() {
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

    