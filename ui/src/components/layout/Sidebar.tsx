"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, useCallback } from "react";
import {
  MessageSquare,
  Search,
  Layers,
  Clapperboard,
  CalendarDays,
  BarChart3,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotificationCount } from "@/hooks/useNotificationCount";
import { ProfileMenu } from "@/components/layout/ProfileMenu";
import { useSidebar } from "@/contexts/SidebarContext";
import { useThread } from "@/contexts/ThreadContext";

const links = [
  { href: "/", label: "New Thread", icon: MessageSquare },
  { href: "/search", label: "Search", icon: Search },
  { href: "/runs", label: "Spaces", icon: Layers },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/creators", label: "Creators", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const notificationCount = useNotificationCount();
  const { collapsed, toggle } = useSidebar();
  const { newChat } = useThread();
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (!collapsed) return;
    setHoverExpanded(true);
  }, [collapsed]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHoverExpanded(false);
  }, []);

  // Visual state: show expanded width when not collapsed, or when hover-expanded
  const visualExpanded = !collapsed || hoverExpanded;

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "fixed top-3 left-3 bottom-3 bg-surface-1 border border-border rounded-xl shadow-elevation-2 flex flex-col z-40 transition-all duration-300 overflow-hidden",
        visualExpanded ? "w-56" : "w-16",
        // When hover-expanded (collapsed but hovering), float over content
        collapsed && hoverExpanded && "z-50 shadow-elevation-3"
      )}
    >
      {/* Logo */}
      <Link
        href="/"
        onClick={() => newChat()}
        className="flex items-center gap-2.5 px-4 py-4 border-b border-border/50 min-h-[56px]"
      >
        <Clapperboard className="h-5 w-5 text-accent flex-shrink-0" />
        {visualExpanded && (
          <span className="text-[15px] font-semibold tracking-tight whitespace-nowrap">
            Clip<span className="text-accent">Bot</span>
          </span>
        )}
      </Link>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-0.5 p-2.5 mt-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={!visualExpanded ? label : undefined}
              onClick={href === "/" ? () => newChat() : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-150 relative group",
                !visualExpanded && "justify-center px-0",
                active
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:text-foreground hover:bg-surface-2"
              )}
            >
              <Icon className={cn(
                "h-4 w-4 flex-shrink-0 transition-colors duration-150",
                active ? "text-accent" : "text-muted group-hover:text-foreground"
              )} />
              {visualExpanded && (
                <>
                  <span className="whitespace-nowrap">{label}</span>
                  {label === "Creators" && notificationCount > 0 && (
                    <span className="ml-auto flex h-[18px] min-w-[18px] px-1 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
                      {notificationCount > 9 ? "9+" : notificationCount}
                    </span>
                  )}
                </>
              )}
              {!visualExpanded && label === "Creators" && notificationCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Profile + Collapse */}
      <div className="border-t border-border/50 p-2.5 space-y-0.5">
        <ProfileMenu compact={!visualExpanded} />

        <button
          onClick={toggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-muted hover:text-foreground hover:bg-surface-2 transition-colors duration-150 w-full cursor-pointer group",
            !visualExpanded && "justify-center px-0"
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4 flex-shrink-0 text-muted group-hover:text-foreground transition-colors duration-150" />
          ) : (
            <PanelLeftClose className="h-4 w-4 flex-shrink-0 text-muted group-hover:text-foreground transition-colors duration-150" />
          )}
          {visualExpanded && (collapsed ? "Expand" : "Collapse")}
        </button>
      </div>
    </aside>
  );
}
