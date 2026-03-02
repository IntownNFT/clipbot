"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { SpaceSelector } from "@/components/spaces/SpaceSelector";
import { useSpace } from "@/contexts/SpaceContext";

interface PromptInputProps {
  onSubmit: (runId: string, sourceUrl: string) => void;
  /** When set externally (e.g. from space detail page), selector is read-only */
  spaceId?: string;
  /** Remove max-width constraint so input stretches to fill parent */
  fullWidth?: boolean;
}

export function PromptInput({ onSubmit, spaceId: externalSpaceId, fullWidth }: PromptInputProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { activeSpaceId, setActiveSpace } = useSpace();

  // Effective spaceId: external prop takes priority, then context
  const spaceId = externalSpaceId ?? activeSpaceId ?? undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || loading) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, spaceId }),
      });

      const data = await res.json();

      if (res.status === 409 && data.existingRunId) {
        if (data.alreadyComplete) {
          const retryRes = await fetch("/api/runs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, spaceId, force: true }),
          });
          const retryData = await retryRes.json();
          if (retryRes.ok) {
            setUrl("");
            onSubmit(retryData.runId, url);
          } else {
            setError(retryData.error || "Failed to start pipeline");
          }
        } else {
          setError("This video is already being processed");
        }
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to start pipeline");
      }

      setUrl("");
      onSubmit(data.runId, url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setLoading(false);
  };

  return (
    <div className={cn(fullWidth ? "" : "bg-surface-0 px-4 py-3")}>
      <form
        onSubmit={handleSubmit}
        className={cn(
          "bg-surface-1 border border-border rounded-2xl overflow-hidden shadow-elevation-1 transition-all duration-200 focus-within:border-accent/30 focus-within:shadow-elevation-2",
          !fullWidth && "max-w-2xl mx-auto"
        )}
      >
        {/* Body — URL input */}
        <div className="px-4 pt-3 pb-2">
          <input
            type="url"
            placeholder="Paste a YouTube URL..."
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError("");
            }}
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted/50 outline-none"
            required
          />
        </div>

        {/* Footer — space selector (left) + submit (right) */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-border/40">
          <div className="flex items-center gap-1">
            <SpaceSelector
              value={externalSpaceId ?? activeSpaceId}
              onChange={(id) => {
                if (!externalSpaceId) setActiveSpace(id);
              }}
              readOnly={!!externalSpaceId}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className={cn(
                "flex items-center justify-center h-8 w-8 rounded-lg transition-all duration-200 cursor-pointer",
                url.trim() && !loading
                  ? "bg-accent text-white hover:bg-accent/90"
                  : "bg-surface-2 text-muted cursor-not-allowed"
              )}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </form>

      {error && (
        <p className={cn("text-xs text-red-400 mt-1.5 px-4", !fullWidth && "max-w-2xl mx-auto")}>{error}</p>
      )}
    </div>
  );
}
