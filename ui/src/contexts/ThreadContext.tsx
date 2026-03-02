"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface ThreadContextValue {
  activeThreadId: string | null;
  setActiveThread: (id: string | null) => void;
}

const ThreadContext = createContext<ThreadContextValue | null>(null);

export function ThreadProvider({ children }: { children: ReactNode }) {
  const [activeThreadId, setActiveThread] = useState<string | null>(null);

  return (
    <ThreadContext value={{ activeThreadId, setActiveThread }}>
      {children}
    </ThreadContext>
  );
}

export function useThread(): ThreadContextValue {
  const ctx = useContext(ThreadContext);
  if (!ctx) throw new Error("useThread must be used within ThreadProvider");
  return ctx;
}
