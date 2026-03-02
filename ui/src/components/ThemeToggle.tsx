"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  compact?: boolean;
}

export function ThemeToggle({ compact }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted w-full justify-center">
        <div className="w-4 h-4" />
        {!compact && "Theme"}
      </button>
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted hover:text-foreground hover:bg-surface-2 transition-all duration-200 w-full cursor-pointer group ${compact ? "justify-center" : ""}`}
    >
      {isDark ? (
        <Sun className="h-4 w-4 flex-shrink-0 group-hover:text-brand-gold transition-colors" />
      ) : (
        <Moon className="h-4 w-4 flex-shrink-0 group-hover:text-accent transition-colors" />
      )}
      {!compact && (isDark ? "Light Mode" : "Dark Mode")}
    </button>
  );
}
