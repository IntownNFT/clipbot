"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Loader2, Upload, CheckCircle, AlertCircle, Cookie } from "lucide-react";
import type { SettingsState } from "@/hooks/useSettings";

interface CookieStatus {
  exists: boolean;
  hasAuth?: boolean;
  size?: number;
  modified?: string;
}

function YouTubeCookies() {
  const [status, setStatus] = useState<CookieStatus | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/cookies")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ exists: false }));
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      const text = await file.text();
      if (!text.includes("youtube.com") && !text.includes(".google.com")) {
        setMessage({ type: "error", text: "This doesn't look like YouTube cookies. Export from youtube.com while logged in." });
        setUploading(false);
        return;
      }
      const res = await fetch("/api/cookies", { method: "PUT", body: text });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Cookies uploaded! YouTube downloads should work now." });
        // Refresh status
        const st = await fetch("/api/cookies").then((r) => r.json());
        setStatus(st);
      } else {
        setMessage({ type: "error", text: data.error || "Upload failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to upload cookies" });
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Card className="space-y-4 px-6">
      <div className="flex items-center gap-2">
        <Cookie className="h-4 w-4 text-muted" />
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
          YouTube Cookies
        </h2>
      </div>
      <p className="text-xs text-muted">
        YouTube blocks downloads from datacenter IPs. Upload cookies from a logged-in browser session to authenticate.
      </p>

      {/* Status */}
      {status && (
        <div className="flex items-center gap-2 text-sm">
          {status.exists && status.hasAuth ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-green-600">Auth cookies present</span>
              {status.modified && (
                <span className="text-xs text-muted ml-auto">
                  Updated {new Date(status.modified).toLocaleDateString()}
                </span>
              )}
            </>
          ) : status.exists ? (
            <>
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span className="text-amber-600">Cookies exist but missing auth tokens — re-export while logged in</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-red-600">No cookies uploaded</span>
            </>
          )}
        </div>
      )}

      {/* Upload */}
      <div className="flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept=".txt"
          onChange={handleUpload}
          className="hidden"
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? "Uploading..." : "Upload cookies.txt"}
        </Button>
      </div>

      {message && (
        <p className={`text-xs ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
          {message.text}
        </p>
      )}

      <details className="text-xs text-muted">
        <summary className="cursor-pointer hover:text-foreground">How to export cookies</summary>
        <ol className="mt-2 ml-4 list-decimal space-y-1">
          <li>Install &quot;Get cookies.txt LOCALLY&quot; browser extension</li>
          <li>Go to youtube.com and sign in</li>
          <li>Click the extension icon and export cookies for youtube.com</li>
          <li>Upload the exported cookies.txt file here</li>
        </ol>
      </details>
    </Card>
  );
}

interface ConnectorsTabProps {
  state: SettingsState;
  togglePlatform: (platform: string) => void;
  fetchAccounts: () => void;
}

export function ConnectorsTab({ state, togglePlatform, fetchAccounts }: ConnectorsTabProps) {
  return (
    <div className="space-y-6">
      {/* YouTube Cookies */}
      <YouTubeCookies />

      {/* Default Publish Platforms */}
      <Card className="space-y-4 px-6">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
          Default Publish Platforms
        </h2>
        <p className="text-xs text-muted">
          Select which platforms clips are published to by default.
        </p>
        <div className="flex gap-4 flex-wrap">
          {["tiktok", "youtube", "instagram", "facebook"].map((p) => (
            <label
              key={p}
              className="flex items-center gap-2 text-sm cursor-pointer capitalize"
            >
              <input
                type="checkbox"
                checked={state.defaultPlatforms.includes(p)}
                onChange={() => togglePlatform(p)}
                className="accent-[var(--color-accent)]"
              />
              {p}
            </label>
          ))}
        </div>
      </Card>

      {/* Connected Accounts */}
      <Card className="space-y-5 px-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
            Connected Accounts
          </h2>
          <Button variant="ghost" size="sm" onClick={fetchAccounts}>
            {state.loadingAccounts ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Fetch
          </Button>
        </div>

        {state.accounts.length > 0 ? (
          <div className="space-y-2">
            {state.accounts.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between text-sm py-2.5 border-b border-border/30 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="green" className="capitalize">
                    {a.platform}
                  </Badge>
                  <span>{a.name}</span>
                </div>
                <span className="text-xs text-muted font-mono">
                  {a.id.slice(0, 8)}...
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">
            Click &quot;Fetch&quot; to load connected accounts from Late API
          </p>
        )}
      </Card>
    </div>
  );
}
