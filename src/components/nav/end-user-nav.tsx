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
  FileText,
  MessageCircle,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/end-user/dashboard", icon: <LayoutDashboard />, label: "Dashboard" },
  { href: "/end-user/invoices", icon: <FileText />, label: "Invoices" },
  { href: "/end-user/messages", icon: <MessageCircle />, label: "Messages" },
  { href: "/end-user/account", icon: <Settings />, label: "Account" },
];

export default function EndUserNav() {
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
