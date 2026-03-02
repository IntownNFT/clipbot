"use client";

import { useState, useEffect } from "react";

export function useNotificationCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchCount = () => {
      fetch("/api/notifications?count=true")
        .then((r) => r.json())
        .then((data) => setCount(data.count ?? 0))
        .catch(() => {});
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return count;
}
