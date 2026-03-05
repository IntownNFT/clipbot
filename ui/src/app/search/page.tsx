"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  ChevronDown,
  Layers,
  Clapperboard,
  SearchX,
  AlertCircle,
  Youtube,
  Globe,
} from "lucide-react";
import { ThreadCard } from "@/components/runs/ThreadCard";
import { ThreadSearch } from "@/components/runs/ThreadSearch";
import { PublishedGrid } from "@/components/runs/PublishedGrid";
import { PageTransition } from "@/components/ui/PageTransition";
import { useThreadList } from "@/hooks/useThreadList";
import { useThread } from "@/contexts/ThreadContext";
import { useSpaces } from "@/hooks/useSpaces";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "threads", label: "Threads" },
  { key: "published", label: "Published" },
  { key: "failed", label: "Failed" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

type SortKey = "recent" | "oldest" | "most-runs";
type SourceFilter = "all" | "youtube" | "twitch" | "tiktok" | "twitter" | "other";
type StatusFilter = "all" | "completed" | "processing" | "failed";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "recent", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "most-runs", label: "Most Runs" },
];

const SOURCE_OPTIONS: { key: SourceFilter; label: string }[] = [
  { key: "all", label: "All sources" },
  { key: "youtube", label: "YouTube" },
  { key: "twitch", label: "Twitch" },
  { key: "tiktok", label: "TikTok" },
  { key: "twitter", label: "Twitter / X" },
  { key: "other", label: "Other" },
];

const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All statuses" },
  { key: "completed", label: "Completed" },
  { key: "processing", label: "Processing" },
  { key: "failed", label: "Failed" },
];

const SOURCE_DOMAINS: Record<Exclude<SourceFilter, "all" | "other">, string[]> = {
  youtube: ["youtube.com", "youtu.be"],
  twitch: ["twitch.tv"],
  tiktok: ["tiktok.com"],
  twitter: ["twitter.com", "x.com"],
};

export default function SearchPage() {
  const { threads, loading } = useThreadList();
  const { setActiveThread } = useThread();
  const { spaces } = useSpaces();
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("threads");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [spaceFilter, setSpaceFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    if (tab === "published") return [];

    let list = threads;

    if (tab === "failed") {
      list = list.filter((t) => t.lastStatus === "failed");
    }

    // Source filter
    if (sourceFilter !== "all") {
      if (sourceFilter === "other") {
        const knownDomains = Object.values(SOURCE_DOMAINS).flat();
        list = list.filter(
          (t) => !knownDomains.some((d) => t.sourceUrl.toLowerCase().includes(d))
        );
      } else {
        const domains = SOURCE_DOMAINS[sourceFilter];
        list = list.filter((t) =>
          domains.some((d) => t.sourceUrl.toLowerCase().includes(d))
        );
      }
    }

    // Status filter
    if (statusFilter !== "all") {
      list = list.filter((t) => t.lastStatus === statusFilter);
    }

    if (spaceFilter === "none") {
      list = list.filter((t) => t.spaceIds.length === 0);
    } else if (spaceFilter !== "all") {
      list = list.filter((t) => t.spaceIds.includes(spaceFilter));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.sourceUrl.toLowerCase().includes(q)
      );
    }

    if (sort === "oldest") {
      list = [...list].sort(
        (a, b) => new Date(a.lastRunAt).getTime() - new Date(b.lastRunAt).getTime()
      );
    } else if (sort === "most-runs") {
      list = [...list].sort((a, b) => b.runCount - a.runCount);
    }

    return list;
  }, [threads, tab, search, sort, spaceFilter, sourceFilter, statusFilter]);

  const handleThreadClick = (threadId: string) => {
    setActiveThread(threadId);
    router.push("/");
  };

  const isPublishedTab = tab === "published";

  const renderEmptyState = () => {
    if (tab === "failed") {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
            <AlertCircle className="h-6 w-6 text-green-500" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">No failed runs</p>
          <p className="text-xs text-muted">All your runs completed successfully</p>
        </div>
      );
    }

    if (search.trim()) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-muted/10 flex items-center justify-center mb-4">
            <SearchX className="h-6 w-6 text-muted" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">No matches</p>
          <p className="text-xs text-muted">Try a different search term</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
          <Clapperboard className="h-6 w-6 text-accent" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">No threads yet</p>
        <p className="text-xs text-muted">Process your first video to see it here</p>
      </div>
    );
  };

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-lg font-semibold">Search</h1>
        </div>

        {/* Underline tabs */}
        <div className="flex gap-6 border-b border-border mb-5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "pb-2.5 text-sm font-medium transition-colors cursor-pointer relative",
                tab === t.key
                  ? "text-foreground"
                  : "text-muted hover:text-foreground"
              )}
            >
              {t.label}
              {tab === t.key && (
                <motion.div
                  layoutId="search-tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full"
                />
              )}
            </button>
          ))}
        </div>

        {/* Published tab — standalone grid */}
        {isPublishedTab ? (
          <PublishedGrid />
        ) : (
          <>
            {/* Search */}
            <div className="mb-4">
              <ThreadSearch value={search} onChange={setSearch} />
            </div>

            {/* Filter chips + sort */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {/* Source filter */}
                <div className="relative">
                  <div className="flex items-center">
                    <Youtube className={cn("h-3 w-3 absolute left-2.5 pointer-events-none", sourceFilter !== "all" ? "text-accent" : "text-muted")} />
                    <select
                      value={sourceFilter}
                      onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
                      className={cn(
                        "appearance-none pl-7 pr-6 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer bg-transparent focus:outline-none",
                        sourceFilter !== "all"
                          ? "border-accent/30 text-accent bg-accent/8"
                          : "border-border text-muted hover:text-foreground hover:bg-surface-1"
                      )}
                    >
                      {SOURCE_OPTIONS.map((o) => (
                        <option key={o.key} value={o.key}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="h-3 w-3 text-muted absolute right-2 pointer-events-none" />
                  </div>
                </div>

                {/* Status filter */}
                <div className="relative">
                  <div className="flex items-center">
                    <Globe className={cn("h-3 w-3 absolute left-2.5 pointer-events-none", statusFilter !== "all" ? "text-accent" : "text-muted")} />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                      className={cn(
                        "appearance-none pl-7 pr-6 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer bg-transparent focus:outline-none",
                        statusFilter !== "all"
                          ? "border-accent/30 text-accent bg-accent/8"
                          : "border-border text-muted hover:text-foreground hover:bg-surface-1"
                      )}
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.key} value={o.key}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="h-3 w-3 text-muted absolute right-2 pointer-events-none" />
                  </div>
                </div>

                {/* Space filter */}
                {spaces.length > 0 && (
                  <div className="relative">
                    <div className="flex items-center">
                      <Layers className={cn("h-3 w-3 absolute left-2.5 pointer-events-none", spaceFilter !== "all" ? "text-accent" : "text-muted")} />
                      <select
                        value={spaceFilter}
                        onChange={(e) => setSpaceFilter(e.target.value)}
                        className={cn(
                          "appearance-none pl-7 pr-6 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer bg-transparent focus:outline-none",
                          spaceFilter !== "all"
                            ? "border-accent/30 text-accent bg-accent/8"
                            : "border-border text-muted hover:text-foreground hover:bg-surface-1"
                        )}
                      >
                        <option value="all">All spaces</option>
                        <option value="none">No space</option>
                        {spaces.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.icon} {s.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="h-3 w-3 text-muted absolute right-2 pointer-events-none" />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted">
                <span>sort:</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="bg-transparent text-foreground text-xs font-medium focus:outline-none cursor-pointer"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Thread list */}
            {loading ? (
              <div className="space-y-0 divide-y divide-border/50">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="py-5 space-y-2">
                    <div className="h-4 w-48 rounded shimmer" />
                    <div className="h-3 w-full rounded shimmer" />
                    <div className="h-3 w-24 rounded shimmer mt-1" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              renderEmptyState()
            ) : (
              <div>
                {filtered.map((thread, i) => (
                  <motion.div
                    key={thread.threadId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.03 * i }}
                  >
                    <ThreadCard
                      thread={thread}
                      onClick={() => handleThreadClick(thread.threadId)}
                      spaces={spaces}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </PageTransition>
  );
}
