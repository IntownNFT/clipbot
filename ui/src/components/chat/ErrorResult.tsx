"use client";

import { AlertTriangle } from "lucide-react";

interface ErrorResultProps {
  error?: { step: string; message: string } | null;
}

export function ErrorResult({ error }: ErrorResultProps) {
  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 space-y-1">
      <div className="flex items-center gap-2 text-red-400">
        <AlertTriangle className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">
          {error ? `Failed at ${error.step}` : "Pipeline failed"}
        </span>
      </div>
      {error && (
        <p className="text-xs text-muted pl-5.5">{error.message}</p>
      )}
    </div>
  );
}
