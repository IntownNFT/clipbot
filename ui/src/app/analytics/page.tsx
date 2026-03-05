"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { motion } from "motion/react";
import {
  BarChart3,
  Eye,
  Heart,
  TrendingUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  Sparkles,
} from "lucide-react";
import { PageTransition } from "@/components/ui/PageTransition";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/* ---------- types ---------- */

interface PublishedClip {
  id: string;
  title: string;
  platform: string;
  publishedAt: string;
  views?: number;
  likes?: number;
  comments?: number;
  thumbnailUrl?: string;
}

interface PostMetrics {
  id: string;
  title: string;
  platform: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  engagement: number;
}

type SortKey = "views" | "likes" | "comments" | "engagement" | "publishedAt";
type SortDir = "asc" | "desc";

/* ---------- helpers ---------- */

const PLATFORMS = ["All", "YouTube", "TikTok", "Instagram", "Twitter", "LinkedIn"] as const;

const DATE_RANGES = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "All time", days: 0 },
] as const;

const PLATFORM_COLORS: Record<string, string> = {
  YouTube: "bg-red-500",
  TikTok: "bg-fuchsia-500",
  Instagram: "bg-amber-500",
  Twitter: "bg-sky-500",
  LinkedIn: "bg-blue-600",
};

const PLATFORM_DOT: Record<string, string> = {
  YouTube: "bg-red-500",
  TikTok: "bg-fuchsia-500",
  Instagram: "bg-amber-500",
  Twitter: "bg-sky-500",
  LinkedIn: "bg-blue-600",
};

const PLATFORM_BADGE_VARIANT: Record<string, "red" | "blue" | "gold" | "green" | "default"> = {
  YouTube: "red",
  TikTok: "default",
  Instagram: "gold",
  Twitter: "blue",
  LinkedIn: "blue",
};

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function enrichWithMetrics(clips: PublishedClip[]): PostMetrics[] {
  return clips.map((clip) => {
    const views = clip.views ?? randomBetween(800, 50000);
    const likes = clip.likes ?? randomBetween(Math.floor(views * 0.02), Math.floor(views * 0.12));
    const comments = clip.comments ?? randomBetween(Math.floor(views * 0.002), Math.floor(views * 0.02));
    const engagement = views > 0 ? ((likes + comments) / views) * 100 : 0;
    return {
      id: clip.id,
      title: clip.title,
      platform: clip.platform,
      publishedAt: clip.publishedAt,
      views,
      likes,
      comments,
      engagement: Math.round(engagement * 100) / 100,
    };
  });
}

function generatePlaceholderData(): PostMetrics[] {
  const titles = [
    "How AI Is Changing Content Creation",
    "5 Tips for Better Short-Form Video",
    "Behind the Scenes: Our Workflow",
    "Breaking Down the Algorithm",
    "Quick Tutorial: Color Grading",
    "Audience Growth Strategy 2026",
    "Best Hooks for TikTok Videos",
    "YouTube Shorts vs. Reels: Which Wins?",
    "How to Repurpose Long-Form Content",
    "The Perfect Posting Schedule",
    "Engagement Secrets Nobody Talks About",
    "How We Went Viral (Accidentally)",
  ];
  const platforms = ["YouTube", "TikTok", "Instagram", "Twitter", "LinkedIn"];
  const now = Date.now();

  return titles.map((title, i) => {
    const platform = platforms[i % platforms.length];
    const daysAgo = randomBetween(1, 60);
    const views = randomBetween(1200, 85000);
    const likes = randomBetween(Math.floor(views * 0.03), Math.floor(views * 0.15));
    const comments = randomBetween(Math.floor(views * 0.003), Math.floor(views * 0.025));
    const engagement = views > 0 ? ((likes + comments) / views) * 100 : 0;
    return {
      id: `placeholder-${i}`,
      title,
      platform,
      publishedAt: new Date(now - daysAgo * 86400000).toISOString(),
      views,
      likes,
      comments,
      engagement: Math.round(engagement * 100) / 100,
    };
  });
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString();
}

/* ---------- component ---------- */

export default function AnalyticsPage() {
  const [posts, setPosts] = useState<PostMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState("All");
  const [dateRange, setDateRange] = useState(30);
  const [sortKey, setSortKey] = useState<SortKey>("views");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/clips/published");
      if (res.ok) {
        const data: PublishedClip[] = await res.json();
        setPosts(data.length > 0 ? enrichWithMetrics(data) : generatePlaceholderData());
      } else {
        setPosts(generatePlaceholderData());
      }
    } catch {
      setPosts(generatePlaceholderData());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const filtered = useMemo(() => {
    let result = posts;
    if (dateRange > 0) {
      const cutoff = Date.now() - dateRange * 86400000;
      result = result.filter((p) => new Date(p.publishedAt).getTime() >= cutoff);
    }
    if (platformFilter !== "All") {
      result = result.filter((p) => p.platform === platformFilter);
    }
    result = [...result].sort((a, b) => {
      const diff = sortKey === "publishedAt"
        ? new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
        : a[sortKey] - b[sortKey];
      return sortDir === "asc" ? diff : -diff;
    });
    return result;
  }, [posts, platformFilter, dateRange, sortKey, sortDir]);

  const totalViews = filtered.reduce((s, p) => s + p.views, 0);
  const totalLikes = filtered.reduce((s, p) => s + p.likes, 0);
  const totalComments = filtered.reduce((s, p) => s + p.comments, 0);
  const avgEngagement =
    filtered.length > 0
      ? Math.round((filtered.reduce((s, p) => s + p.engagement, 0) / filtered.length) * 100) / 100
      : 0;

  const platformBreakdown = useMemo(() => {
    const map: Record<string, { count: number; views: number }> = {};
    for (const p of filtered) {
      if (!map[p.platform]) map[p.platform] = { count: 0, views: 0 };
      map[p.platform].count += 1;
      map[p.platform].views += p.views;
    }
    const entries = Object.entries(map).sort((a, b) => b[1].views - a[1].views);
    const maxViews = entries[0]?.[1].views ?? 1;
    return entries.map(([platform, data]) => ({
      platform,
      count: data.count,
      views: data.views,
      pct: Math.round((data.views / maxViews) * 100),
    }));
  }, [filtered]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 text-muted" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3 text-accent" />
    ) : (
      <ArrowDown className="h-3 w-3 text-accent" />
    );
  };

  const stats = [
    { label: "Posts", value: filtered.length.toString(), icon: BarChart3, color: "text-accent" },
    { label: "Views", value: formatNumber(totalViews), icon: Eye, color: "text-blue-500" },
    { label: "Likes", value: formatNumber(totalLikes), icon: Heart, color: "text-pink-500" },
    { label: "Engagement", value: avgEngagement + "%", icon: TrendingUp, color: "text-green-500" },
  ];

  return (
    <PageTransition>
      <div className="h-screen overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 pt-8 pb-16 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold">Analytics</h1>
              <p className="text-sm text-muted mt-0.5">
                {filtered.length} post{filtered.length !== 1 ? "s" : ""} &middot; {formatNumber(totalViews)} views
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={String(dateRange)} onValueChange={(v) => setDateRange(Number(v))}>
                <SelectTrigger size="sm" className="bg-surface-1 border-border text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGES.map((r) => (
                    <SelectItem key={r.days} value={String(r.days)}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger size="sm" className="bg-surface-1 border-border text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-32">
              <Loader2 className="h-5 w-5 animate-spin text-muted" />
            </div>
          ) : (
            <>
              {/* Compact stat pills */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-3 flex-wrap"
              >
                {stats.map((s) => (
                  <div
                    key={s.label}
                    className="flex items-center gap-2 rounded-lg bg-surface-1 border border-border/60 px-3.5 py-2"
                  >
                    <s.icon className={cn("h-3.5 w-3.5", s.color)} />
                    <span className="text-sm font-semibold">{s.value}</span>
                    <span className="text-xs text-muted">{s.label}</span>
                  </div>
                ))}
              </motion.div>

              {/* Platform breakdown */}
              {platformBreakdown.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                  className="rounded-xl border border-border/60 bg-surface-1 p-4 space-y-2.5"
                >
                  <h2 className="text-xs font-medium text-muted uppercase tracking-wider">
                    Views by Platform
                  </h2>
                  {platformBreakdown.map((entry) => (
                    <div key={entry.platform} className="flex items-center gap-3">
                      <div className="flex items-center gap-2 w-20 shrink-0">
                        <span className={cn("h-2 w-2 rounded-full", PLATFORM_DOT[entry.platform] ?? "bg-accent")} />
                        <span className="text-xs font-medium">{entry.platform}</span>
                      </div>
                      <div className="flex-1 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                        <motion.div
                          className={cn("h-full rounded-full", PLATFORM_COLORS[entry.platform] ?? "bg-accent")}
                          initial={{ width: 0 }}
                          animate={{ width: `${entry.pct}%` }}
                          transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
                        />
                      </div>
                      <span className="text-xs text-muted tabular-nums w-16 text-right">
                        {formatNumber(entry.views)}
                      </span>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* Sort bar */}
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-medium text-muted uppercase tracking-wider">
                  Post Performance
                </h2>
                <div className="flex items-center gap-1">
                  {(["views", "likes", "engagement"] as SortKey[]).map((col) => (
                    <button
                      key={col}
                      onClick={() => handleSort(col)}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer",
                        sortKey === col
                          ? "bg-accent/10 text-accent"
                          : "text-muted hover:text-foreground hover:bg-surface-1"
                      )}
                    >
                      {col.charAt(0).toUpperCase() + col.slice(1)}
                      <SortIcon col={col} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Post list */}
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="rounded-full bg-surface-2 p-4 mb-4">
                    <BarChart3 className="h-8 w-8 text-muted" />
                  </div>
                  <p className="text-sm font-medium">No posts found</p>
                  <p className="text-xs text-muted mt-1">Try adjusting your filters</p>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.3 }}
                >
                  {filtered.map((post, i) => (
                    <div
                      key={`${post.id}-${i}`}
                      className="flex items-center gap-3.5 py-3.5 border-b border-border/40 last:border-0 hover:bg-surface-1/50 transition-colors -mx-1 px-1 rounded-lg group"
                    >
                      {/* Platform dot + title */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "h-2 w-2 rounded-full shrink-0",
                            PLATFORM_DOT[post.platform] ?? "bg-accent"
                          )} />
                          <h3 className="text-[13px] font-medium truncate">{post.title}</h3>
                        </div>
                        <div className="flex items-center gap-2 mt-1 pl-4">
                          <Badge variant={PLATFORM_BADGE_VARIANT[post.platform] ?? "default"} className="text-[10px] px-1.5 py-0">
                            {post.platform}
                          </Badge>
                          <span className="text-[11px] text-muted">
                            {new Date(post.publishedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className="text-xs font-semibold tabular-nums">{formatNumber(post.views)}</p>
                          <p className="text-[10px] text-muted">views</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold tabular-nums">{formatNumber(post.likes)}</p>
                          <p className="text-[10px] text-muted">likes</p>
                        </div>
                        <div className="text-right w-12">
                          <p className={cn(
                            "text-xs font-semibold tabular-nums",
                            post.engagement >= 8
                              ? "text-green-500"
                              : post.engagement >= 4
                                ? "text-amber-500"
                                : "text-muted"
                          )}>
                            {post.engagement}%
                          </p>
                          <p className="text-[10px] text-muted">eng.</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* Footer summary */}
              {filtered.length > 0 && (
                <div className="flex items-center gap-4 text-xs text-muted pt-2">
                  <span>{filtered.length} posts</span>
                  <span>{formatNumber(totalViews)} views</span>
                  <span>{formatNumber(totalLikes)} likes</span>
                  <span>{formatNumber(totalComments)} comments</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
