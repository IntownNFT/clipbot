"use client";

import { useEffect, useState, useCallback } from "react";

interface Space {
  id: string;
  name: string;
  description: string;
  icon: string;
  settings: Record<string, unknown>;
  accounts: string[];
  creators: string[];
  createdAt: string;
  updatedAt: string;
}

export function useSpaces() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSpaces = useCallback(async () => {
    try {
      const res = await fetch("/api/spaces");
      const data = await res.json();
      setSpaces(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSpaces();
  }, [fetchSpaces]);

  return { spaces, loading, refetch: fetchSpaces };
}
