"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExternalLink, Key, Terminal, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

type AuthMethod = "api-key" | "setup-token";

export default function LoginPage() {
  const router = useRouter();
  const [method, setMethod] = useState<AuthMethod>("api-key");
  const [apiKey, setApiKey] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [connected, setConnected] = useState(false);
  const [connectedMethod, setConnectedMethod] = useState<string | null>(null);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);

  // Check existing auth on mount
  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((data) => {
        setConnected(data.connected);
        setConnectedMethod(data.method);
        setMaskedKey(data.masked);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      const body =
        method === "api-key"
          ? { method: "api-key", apiKey }
          : { method: "setup-token", token };

      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Authentication failed");
        return;
      }

      // Success — redirect to home
      router.push("/");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-light tracking-tight text-foreground/80">
            Connect to Claude
          </h1>
          <p className="mt-2 text-sm text-muted">
            ClipBot needs an Anthropic API connection to power its AI chat.
          </p>
        </div>

        {/* Existing connection status */}
        {connected && (
          <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            <span className="text-green-400">
              Connected via {connectedMethod === "api-key" ? "API Key" : "Setup Token"}{" "}
              <span className="text-muted">({maskedKey})</span>
            </span>
          </div>
        )}

        {/* Method selector */}
        <div className="flex gap-2">
          <button
            onClick={() => { setMethod("api-key"); setError(""); }}
            className={`flex-1 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
              method === "api-key"
                ? "border-accent bg-accent/5 text-foreground"
                : "border-border bg-surface-1 text-muted hover:border-border/80"
            }`}
          >
            <div className="flex items-center gap-2 font-medium">
              <Key className="h-4 w-4" />
              API Key
            </div>
            <p className="mt-1 text-xs text-muted">Recommended</p>
          </button>

          <button
            onClick={() => { setMethod("setup-token"); setError(""); }}
            className={`flex-1 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
              method === "setup-token"
                ? "border-accent bg-accent/5 text-foreground"
                : "border-border bg-surface-1 text-muted hover:border-border/80"
            }`}
          >
            <div className="flex items-center gap-2 font-medium">
              <Terminal className="h-4 w-4" />
              Setup Token
            </div>
            <p className="mt-1 text-xs text-muted">Claude subscription</p>
          </button>
        </div>

        {/* API Key method */}
        {method === "api-key" && (
          <div className="space-y-4">
            <div>
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
              >
                Get API Key
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            <Input
              id="api-key"
              label="API Key"
              type="password"
              placeholder="sk-ant-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && apiKey && handleSubmit()}
            />

            <Button
              onClick={handleSubmit}
              disabled={!apiKey.startsWith("sk-ant-") || loading}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Verify & Save"
              )}
            </Button>
          </div>
        )}

        {/* Setup Token method */}
        {method === "setup-token" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-xs text-yellow-400 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Uses your Claude Pro/Max subscription. May be restricted by
                Anthropic TOS.
              </span>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted">Run this in your terminal:</p>
              <pre className="rounded-lg bg-surface-2 border border-border px-4 py-3 text-sm font-mono text-foreground select-all">
                claude setup-token
              </pre>
              <p className="text-sm text-muted">Then paste the token below:</p>
            </div>

            <Input
              id="setup-token"
              label="Setup Token"
              type="password"
              placeholder="Paste token from claude setup-token..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && token && handleSubmit()}
            />

            <Button
              onClick={handleSubmit}
              disabled={!token || loading}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Verify & Save"
              )}
            </Button>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
