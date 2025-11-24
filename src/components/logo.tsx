import { ParkingSquare } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2", className)}>
      <ParkingSquare className="h-8 w-8 text-primary" />
      <span className="text-xl font-bold tracking-tight">ParkX</span>
    </Link>
  );
}
