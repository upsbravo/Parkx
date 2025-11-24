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
  CreditCard,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";

const navItems = [
  { href: "/super-admin/dashboard", icon: <LayoutDashboard />, label: "Dashboard" },
  { href: "/super-admin/vendors", icon: <Building />, label: "Vendors" },
  { href: "/super-admin/subscriptions", icon: <CreditCard />, label: "Subscriptions" },
  { href: "/super-admin/support", icon: <MessageSquare />, label: "Support" },
  { href: "/super-admin/access-control", icon: <ShieldCheck />, label: "Access Control" },
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
