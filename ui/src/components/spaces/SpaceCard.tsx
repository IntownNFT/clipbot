"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface SpaceCardProps {
  id: string;
  name: string;
  icon: string;
  active: boolean;
  collapsed: boolean;
}

export function SpaceCard({ id, name, icon, active, collapsed }: SpaceCardProps) {
  return (
    <Link
      href={`/spaces/${id}`}
      title={collapsed ? name : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
        !collapsed ? "" : "justify-center px-0",
        active
          ? "bg-accent/12 text-accent border border-accent/15"
          : "text-muted hover:text-foreground hover:bg-surface-2 border border-transparent"
      )}
    >
      <span className="text-base flex-shrink-0">{icon}</span>
      {!collapsed && (
        <span className="truncate">{name}</span>
      )}
    </Link>
  );
}
