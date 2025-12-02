
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  ParkingSquare,
  BadgeCheck,
  Settings,
  MessageCircle,
  LifeBuoy,
  BookCopy,
  Palette,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const navItems = [
  { href: "/vendor-admin/dashboard", icon: <LayoutDashboard />, label: "Dashboard" },
  { href: "/vendor-admin/users", icon: <Users />, label: "User Management" },
  { href: "/vendor-admin/parking-lot", icon: <ParkingSquare />, label: "Parking Lot" },
  { href: "/vendor-admin/approvals", icon: <BadgeCheck />, label: "Approvals" },
  { href: "/vendor-admin/messages", icon: <MessageCircle />, label: "User Messages" },
  {
    label: "Accounting",
    icon: <BookCopy />,
    subItems: [
      { href: "/vendor-admin/accounting/financial-summary", label: "Financial Summary" },
      { href: "/vendor-admin/user-invoices", label: "User Invoices" },
      { href: "/vendor-admin/invoices", label: "My Invoices" },
      { href: "/vendor-admin/payouts", label: "Payments & Payouts" },
    ]
  },
  { href: "/vendor-admin/branding", icon: <Palette />, label: "Branding" },
  { href: "/vendor-admin/support", icon: <LifeBuoy />, label: "My Support" },
  { href: "/vendor-admin/account", icon: <Settings />, label: "Account" },
];

export default function VendorAdminNav() {
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
