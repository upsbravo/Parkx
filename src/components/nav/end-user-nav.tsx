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
  Car,
  User,
  FileText,
  MessageCircle,
} from "lucide-react";

const navItems = [
  { href: "/end-user/dashboard", icon: <LayoutDashboard />, label: "Dashboard" },
  { href: "/end-user/my-spot", icon: <Car />, label: "My Spot" },
  { href: "/end-user/profile", icon: <User />, label: "Profile" },
  { href: "/end-user/billing", icon: <FileText />, label: "Billing" },
  { href: "/end-user/messages", icon: <MessageCircle />, label: "Messages" },
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
