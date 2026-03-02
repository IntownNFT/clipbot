"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface SpaceContextValue {
  activeSpaceId: string | null;
  setActiveSpace: (id: string | null) => void;
}

const SpaceContext = createContext<SpaceContextValue | null>(null);

const STORAGE_KEY = "clipbot-active-space";

export function SpaceProvider({ children }: { children: ReactNode }) {
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setActiveSpaceId(stored);
  }, []);

  const setActiveSpace = useCallback((id: string | null) => {
    setActiveSpaceId(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return (
    <SpaceContext value={{ activeSpaceId, setActiveSpace }}>
      {children}
    </SpaceContext>
  );
}

export function useSpace(): SpaceContextValue {
  const ctx = useContext(SpaceContext);
  if (!ctx) throw new Error("useSpace must be used within SpaceProvider");
  return ctx;
}
