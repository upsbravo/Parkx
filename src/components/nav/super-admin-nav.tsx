
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
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
  PenSquare,
} from "lucide-react";
import * as React from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const navItems = [
  { href: "/super-admin/dashboard", icon: <LayoutDashboard />, label: "Dashboard" },
  { href: "/super-admin/vendors", icon: <Building />, label: "Vendor Management" },
  { href: "/super-admin/approvals", icon: <BadgeCheck />, label: "Approvals" },
   { href: "/super-admin/content", icon: <PenSquare />, label: "Content" },
  {
    label: "Accounting",
    icon: <BookCopy />,
    subItems: [
      { href: "/super-admin/invoices", label: "Vendor Invoices" },
      { href: "/super-admin/accounting/financial-summary", label: "Financial Summary" },
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
              <div className="w-full">
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
              </div>
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
