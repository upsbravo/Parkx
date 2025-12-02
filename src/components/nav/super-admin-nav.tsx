
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuSub,
  SidebarMenuSubButton,
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
  BookCopy,
} from "lucide-react";
import * as React from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const navItems = [
  { href: "/super-admin/dashboard", icon: <LayoutDashboard />, label: "Dashboard" },
  { href: "/super-admin/vendors", icon: <Building />, label: "Vendor Management" },
  { href: "/super-admin/approvals", icon: <BadgeCheck />, label: "Approvals" },
  {
    label: "Accounting",
    icon: <BookCopy />,
    subItems: [
      { href: "/super-admin/invoices", label: "Vendor Invoices" },
      { href: "/super-admin/accounting/tax-documents", label: "Tax Documents" },
    ]
  },
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
        {navItems.map((item, index) => (
          item.subItems ? (
            <Collapsible key={index} asChild>
              <>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isSubmenu
                      tooltip={item.label}
                      isActive={item.subItems.some(sub => pathname.startsWith(sub.href))}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                </SidebarMenuItem>
                <CollapsibleContent asChild>
                  <SidebarMenuSub>
                    {item.subItems.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.href}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={pathname.startsWith(subItem.href)}
                        >
                          <Link href={subItem.href}>{subItem.label}</Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </>
            </Collapsible>
          ) : (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(item.href!)}
                tooltip={item.label}
              >
                <Link href={item.href!}>
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        ))}
      </SidebarMenu>
    </SidebarContent>
  );
}
