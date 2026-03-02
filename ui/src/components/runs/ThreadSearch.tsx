"use client";

import { Search } from "lucide-react";

interface ThreadSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function ThreadSearch({ value, onChange }: ThreadSearchProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
      <input
        type="text"
        placeholder="Search your threads..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-1 border border-border text-sm placeholder:text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/25 transition-colors"
      />
    </div>
  );
}
