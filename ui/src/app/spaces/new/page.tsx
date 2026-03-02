"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { SpacePanel } from "@/components/spaces/SpacePanel";
import { PromptInput } from "@/components/chat/PromptInput";
import { useSpace } from "@/contexts/SpaceContext";
import { Clock, FileText } from "lucide-react";
import Link from "next/link";
import type { SpaceSettings } from "@/lib/types";
import type { AppSettings } from "@/lib/types";

export default function NewSpacePage() {
  const router = useRouter();
  const { setActiveSpace } = useSpace();

  const [name, setName] = useState("New Space");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("📁");
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [settings, setSettings] = useState<SpaceSettings>({});
  const [globalSettings, setGlobalSettings] = useState<AppSettings>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setGlobalSettings(data))
      .catch(() => {});
  }, []);

  const createSpace = useCallback(async () => {
    if (saving) return null;
    setSaving(true);
    try {
      const res = await fetch("/api/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          icon,
          niche: settings.niche || undefined,
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      setSpaceId(data.id);
      setActiveSpace(data.id);
      return data.id as string;
    } catch {
      return null;
    } finally {
      setSaving(false);
    }
  }, [name, description, icon, settings, saving, setActiveSpace]);

  const handleSubmit = useCallback(
    async (runId: string) => {
      let id = spaceId;
      if (!id) {
        id = await createSpace();
      }
      if (id) {
        router.push(`/spaces/${id}`);
      }
    },
    [spaceId, createSpace, router]
  );

  const handleUpdateSettings = (patch: Partial<SpaceSettings>) => {
    setSettings((prev) => {
      const merged = { ...prev };
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined) {
          delete (merged as Record<string, unknown>)[key];
        } else if (key === "captionStyle" && typeof value === "object" && value !== null) {
          merged.captionStyle = value as SpaceSettings["captionStyle"];
        } else if (key === "scoringWeights" && typeof value === "object" && value !== null) {
          merged.scoringWeights = value as SpaceSettings["scoringWeights"];
        } else {
          (merged as Record<string, unknown>)[key] = value;
        }
      }
      return merged;
    });
  };

  const handleNameBlur = useCallback(async () => {
    if (spaceId || name === "New Space") return;
  }, [spaceId, name]);

  return (
    <div className="h-screen overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 pt-8 pb-16">
        {/* Breadcrumb */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-xs text-muted mb-8">
            <Link href="/runs" className="hover:underline">Spaces</Link>
            <span className="mx-2">&gt;</span>
            <span className="text-foreground">New Space</span>
          </div>
        </motion.div>

        <div className="flex gap-8">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Icon */}
              <div className="mb-4">
                <button
                  onClick={() => {
                    const newIcon = prompt("Enter an emoji:", icon);
                    if (newIcon) setIcon(newIcon);
                  }}
                  className="w-14 h-14 rounded-xl bg-surface-1 border border-border flex items-center justify-center text-2xl hover:bg-surface-2 transition-colors cursor-pointer"
                >
                  {icon === "📁" ? <FileText className="h-7 w-7 text-muted" /> : icon}
                </button>
              </div>

              {/* Editable name */}
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleNameBlur}
                placeholder="New Space"
                className="w-full text-4xl font-bold bg-transparent outline-none placeholder:text-muted/40 text-foreground mb-2 leading-tight"
              />

              {/* Editable description */}
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description of what this Space is for and how to use it"
                className="w-full text-base bg-transparent outline-none placeholder:text-muted/50 text-muted"
              />
            </motion.div>

            {/* PromptInput */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="mt-10"
            >
              <PromptInput
                onSubmit={handleSubmit}
                spaceId={spaceId ?? undefined}
                fullWidth
              />
            </motion.div>

            {/* My threads tab — empty state */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="mt-10"
            >
              <div className="border-b border-border mb-4">
                <span className="text-sm font-medium text-foreground border-b-2 border-foreground pb-2.5 inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  My threads
                </span>
              </div>

              <div className="text-center py-16">
                <p className="text-sm text-muted">
                  Your threads will appear here. Paste a URL above to get started.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Right panel */}
          <div className="w-48 flex-shrink-0 pt-2">
            <div className="sticky top-8">
              <div className="bg-surface-1 border border-border rounded-xl p-4">
                <SpacePanel
                  spaceId=""
                  settings={settings}
                  globalSettings={globalSettings}
                  accounts={[]}
                  creators={[]}
                  onUpdateSettings={handleUpdateSettings}
                  onUpdateAccounts={() => {}}
                  onUpdateCreators={() => {}}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
