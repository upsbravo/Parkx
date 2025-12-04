import { ParkingSquare } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import Image from "next/image";

export function Logo({
  className,
  name,
  logoUrl,
}: {
  className?: string;
  name?: string;
  logoUrl?: string;
}) {
  return (
    <Link href="/" className={cn("flex items-center gap-2", className)}>
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt={name || "ParkX Logo"}
          width={32}
          height={32}
          className="h-8 w-8 rounded-sm object-contain"
        />
      ) : (
        <ParkingSquare className="h-8 w-8 text-primary" />
      )}
      <span className="text-xl font-bold tracking-tight group-data-[collapsible=icon]:hidden">{name || "ParkX"}</span>
    </Link>
  );
}
