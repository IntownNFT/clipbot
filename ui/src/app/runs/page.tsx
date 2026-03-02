"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { Plus, MoreHorizontal, ChevronDown, Layers } from "lucide-react";
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

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "recent", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "most-runs", label: "Most Runs" },
];

export default function RunsPage() {
  const { threads, loading } = useThreadList();
  const { setActiveThread } = useThread();
  const { spaces } = useSpaces();
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("threads");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [spaceFilter, setSpaceFilter] = useState<string>("all");
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showInfo) return;
    const handler = (e: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) {
        setShowInfo(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showInfo]);

  const filtered = useMemo(() => {
    if (tab === "published") return [];

    let list = threads;

    if (tab === "failed") {
      list = list.filter((t) => t.lastStatus === "failed");
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
  }, [threads, tab, search, sort, spaceFilter]);

  const handleThreadClick = (threadId: string) => {
    setActiveThread(threadId);
    router.push("/");
  };

  const isPublishedTab = tab === "published";

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-semibold">Spaces</h1>
          <div className="flex items-center gap-2">
            <div className="relative" ref={infoRef}>
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-surface-1 transition-colors cursor-pointer"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {showInfo && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-surface-1 border border-border p-4 shadow-lg z-50">
                  <p className="text-xs text-muted leading-relaxed">
                    Spaces are for automations and creating presets to use for your custom video creation.
                  </p>
                </div>
              )}
            </div>
            <Link
              href="/spaces/new"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border text-sm font-medium hover:bg-surface-1 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              New Space
            </Link>
          </div>
        </div>

        {/* Space cards grid */}
        {spaces.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            {spaces.map((space, i) => (
              <motion.div
                key={space.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * i }}
              >
                <Link
                  href={`/spaces/${space.id}`}
                  className="flex items-center gap-3 px-4 py-3.5 bg-surface-1 border border-border rounded-xl hover:bg-surface-2 hover:border-border/80 transition-all duration-200 group"
                >
                  <span className="text-2xl">{space.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate group-hover:text-accent transition-colors">
                      {space.name}
                    </div>
                    {space.description && (
                      <div className="text-xs text-muted truncate">{space.description}</div>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}

            {/* New space card */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * spaces.length }}
            >
              <Link
                href="/spaces/new"
                className="flex items-center gap-3 px-4 py-3.5 border border-dashed border-border rounded-xl hover:bg-surface-1 hover:border-border/80 transition-all duration-200 group"
              >
                <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                  <Plus className="h-4 w-4 text-muted group-hover:text-accent transition-colors" />
                </div>
                <span className="text-sm text-muted group-hover:text-foreground transition-colors">
                  Create space
                </span>
              </Link>
            </motion.div>
          </div>
        )}

        {/* Empty state — no spaces yet */}
        {spaces.length === 0 && (
          <div className="mb-6">
            <Link
              href="/spaces/new"
              className="flex items-center gap-3 px-4 py-4 border border-dashed border-border rounded-xl hover:bg-surface-1 hover:border-border/80 transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-lg bg-surface-2 flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                <Plus className="h-5 w-5 text-muted group-hover:text-accent transition-colors" />
              </div>
              <div>
                <div className="text-sm font-medium group-hover:text-foreground transition-colors">
                  Create your first space
                </div>
                <div className="text-xs text-muted">
                  Organize clips by niche with preset settings
                </div>
              </div>
            </Link>
          </div>
        )}

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
                  layoutId="tab-underline"
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
                <button className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted hover:text-foreground hover:bg-surface-1 transition-colors cursor-pointer">
                  Select
                </button>
                <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted hover:text-foreground hover:bg-surface-1 transition-colors cursor-pointer">
                  Source
                  <ChevronDown className="h-3 w-3" />
                </button>
                <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted hover:text-foreground hover:bg-surface-1 transition-colors cursor-pointer">
                  Status
                  <ChevronDown className="h-3 w-3" />
                </button>

                {/* Space filter */}
                {spaces.length > 0 && (
                  <div className="relative">
                    <div className="flex items-center">
                      <Layers className="h-3 w-3 text-muted absolute left-2.5 pointer-events-none" />
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
              <p className="text-muted text-sm py-12 text-center">
                {search.trim() ? "No threads match your search" : "No threads found"}
              </p>
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
