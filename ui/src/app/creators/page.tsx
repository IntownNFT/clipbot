"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AddCreatorDialog } from "@/components/creators/AddCreatorDialog";
import { NotificationQueue } from "@/components/creators/NotificationQueue";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/ui/PageTransition";
import {
  PlusCircle,
  RefreshCw,
  Loader2,
  Users,
  Video,
  Clock,
  ExternalLink,
  Trash2,
  Radio,
} from "lucide-react";
import { timeAgo, cn } from "@/lib/utils";

/* ---------- types ---------- */

interface Creator {
  id: string;
  channelId: string;
  channelName: string;
  channelUrl: string;
  autoProcess: boolean;
  defaultOptions: Record<string, unknown>;
  lastCheckedAt?: string;
  lastVideoId?: string;
}

interface Notification {
  id: string;
  videoId: string;
  videoTitle: string;
  videoUrl: string;
  creatorId: string;
  creatorName: string;
  publishedAt: string;
  status: string;
  runId?: string;
}

/* ---------- helpers ---------- */

const AVATAR_COLORS = [
  "bg-blue-500/10 text-blue-600",
  "bg-green-500/10 text-green-600",
  "bg-purple-500/10 text-purple-600",
  "bg-amber-500/10 text-amber-600",
  "bg-pink-500/10 text-pink-600",
  "bg-cyan-500/10 text-cyan-600",
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getStatusDot(lastCheckedAt?: string): { color: string; label: string } {
  if (!lastCheckedAt) return { color: "bg-gray-400", label: "Never checked" };
  const diffMs = Date.now() - new Date(lastCheckedAt).getTime();
  if (diffMs < 3600000) return { color: "bg-green-500", label: "Active" };
  if (diffMs < 86400000) return { color: "bg-amber-500", label: "Checked today" };
  return { color: "bg-gray-400", label: "Stale" };
}

/* ---------- component ---------- */

export default function CreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [checking, setChecking] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCreators = useCallback(() => {
    fetch("/api/creators").then((r) => r.json()).then(setCreators).catch(() => {});
  }, []);

  const fetchNotifications = useCallback(() => {
    fetch("/api/notifications").then((r) => r.json()).then(setNotifications).catch(() => {});
  }, []);

  useEffect(() => {
    fetchCreators();
    fetchNotifications();
    const interval = setInterval(() => {
      fetch("/api/creators/check", { method: "POST" })
        .then(() => { fetchCreators(); fetchNotifications(); })
        .catch(() => {});
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchCreators, fetchNotifications]);

  const handleCheckNow = async () => {
    setChecking(true);
    try {
      await fetch("/api/creators/check", { method: "POST" });
      fetchCreators();
      fetchNotifications();
    } catch { /* */ }
    setChecking(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await fetch(`/api/creators/${id}`, { method: "DELETE" });
    fetchCreators();
    setDeletingId(null);
  };

  const handleProcess = async (notificationId: string) => {
    await fetch(`/api/notifications/${notificationId}/process`, { method: "POST" });
    fetchNotifications();
  };

  const handleDismiss = async (notificationId: string) => {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: notificationId, status: "dismissed" }),
    });
    fetchNotifications();
  };

  const pendingNotifications = notifications.filter((n) => n.status === "pending");

  const lastCheckedLabel = useMemo(() => {
    const timestamps = creators
      .map((c) => c.lastCheckedAt)
      .filter((t): t is string => Boolean(t));
    if (timestamps.length === 0) return null;
    return timeAgo(timestamps.reduce((a, b) => (new Date(a) > new Date(b) ? a : b)));
  }, [creators]);

  return (
    <PageTransition>
      <div className="h-screen overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 pt-8 pb-16 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold">Creators</h1>
              <p className="text-sm text-muted mt-0.5">
                {creators.length === 0
                  ? "Monitor YouTube channels for new uploads"
                  : `${creators.length} creator${creators.length !== 1 ? "s" : ""} tracked`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {creators.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCheckNow}
                  disabled={checking}
                  className="text-xs"
                >
                  {checking ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  Check Now
                </Button>
              )}
              <Button size="sm" onClick={() => setShowAdd(true)}>
                <PlusCircle className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
          </div>

          {/* Stat pills */}
          {creators.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-3 flex-wrap"
            >
              <div className="flex items-center gap-2 rounded-lg bg-surface-1 border border-border/60 px-3.5 py-2">
                <Users className="h-3.5 w-3.5 text-accent" />
                <span className="text-sm font-semibold">{creators.length}</span>
                <span className="text-xs text-muted">tracked</span>
              </div>
              {pendingNotifications.length > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-500/8 border border-amber-500/20 px-3.5 py-2">
                  <Video className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-sm font-semibold text-amber-600">{pendingNotifications.length}</span>
                  <span className="text-xs text-amber-600/70">new</span>
                </div>
              )}
              {lastCheckedLabel && (
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Clock className="h-3 w-3" />
                  <span>Checked {lastCheckedLabel}</span>
                </div>
              )}
            </motion.div>
          )}

          {/* New Videos */}
          <AnimatePresence>
            {pendingNotifications.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 overflow-hidden"
              >
                <div className="flex items-center gap-2">
                  <Radio className="h-3 w-3 text-amber-500" />
                  <h2 className="text-xs font-medium text-muted uppercase tracking-wider">
                    New Videos ({pendingNotifications.length})
                  </h2>
                </div>
                <NotificationQueue
                  notifications={pendingNotifications}
                  onProcess={handleProcess}
                  onDismiss={handleDismiss}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Creator list */}
          {creators.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="rounded-full bg-surface-2 p-5 mb-4">
                <Users className="h-8 w-8 text-muted" />
              </div>
              <p className="text-sm font-medium">No creators yet</p>
              <p className="text-xs text-muted mt-1 mb-4 max-w-xs text-center">
                Add a YouTube channel to automatically detect new uploads and create clips
              </p>
              <Button size="sm" onClick={() => setShowAdd(true)}>
                <PlusCircle className="h-3.5 w-3.5" />
                Add Creator
              </Button>
            </motion.div>
          ) : (
            <div>
              <h2 className="text-xs font-medium text-muted uppercase tracking-wider mb-2">
                Channels
              </h2>
              {creators.map((creator, i) => {
                const avatarColor = AVATAR_COLORS[hashString(creator.channelId) % AVATAR_COLORS.length];
                const initial = creator.channelName.charAt(0).toUpperCase();
                const status = getStatusDot(creator.lastCheckedAt);

                return (
                  <motion.div
                    key={creator.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.03 * i, duration: 0.25 }}
                    className="flex items-center gap-3.5 py-3.5 border-b border-border/40 last:border-0 hover:bg-surface-1/50 transition-colors -mx-1 px-1 rounded-lg group"
                  >
                    {/* Avatar */}
                    <div className={cn(
                      "h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                      avatarColor
                    )}>
                      {initial}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[13px] font-medium truncate">{creator.channelName}</h3>
                        <span
                          className={cn("h-1.5 w-1.5 rounded-full shrink-0", status.color)}
                          title={status.label}
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <a
                          href={creator.channelUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[11px] text-muted hover:text-accent transition-colors truncate"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">{creator.channelUrl.replace(/^https?:\/\/(www\.)?/, "")}</span>
                        </a>
                        {creator.lastCheckedAt && (
                          <>
                            <span className="text-muted/30">&middot;</span>
                            <span className="text-[11px] text-muted shrink-0">{timeAgo(creator.lastCheckedAt)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(creator.id)}
                      disabled={deletingId === creator.id}
                      className="p-1.5 rounded-lg text-muted opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {deletingId === creator.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}

          <AddCreatorDialog
            open={showAdd}
            onClose={() => setShowAdd(false)}
            onAdded={() => {
              setShowAdd(false);
              fetchCreators();
            }}
          />
        </div>
      </div>
    </PageTransition>
  );
}
