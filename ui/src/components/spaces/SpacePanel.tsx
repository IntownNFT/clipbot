"use client";

import { useState } from "react";
import { ChevronRight, CalendarDays, Sliders, BarChart3, Users, Radio } from "lucide-react";
import { PipelineSettings } from "./settings/PipelineSettings";
import { ScoringSettings } from "./settings/ScoringSettings";
import { AccountsSettings } from "./settings/AccountsSettings";
import { CreatorsSettings } from "./settings/CreatorsSettings";
import type { SpaceSettings } from "@/lib/types";
import type { AppSettings } from "@/lib/types";
import Link from "next/link";

interface SpacePanelProps {
  spaceId: string;
  settings: SpaceSettings;
  globalSettings: AppSettings;
  accounts: string[];
  creators: string[];
  onUpdateSettings: (patch: Partial<SpaceSettings>) => void;
  onUpdateAccounts: (accounts: string[]) => void;
  onUpdateCreators: (creators: string[]) => void;
}

type ModalKey = "pipeline" | "scoring" | "accounts" | "creators" | null;

export function SpacePanel({
  spaceId,
  settings,
  globalSettings,
  accounts,
  creators,
  onUpdateSettings,
  onUpdateAccounts,
  onUpdateCreators,
}: SpacePanelProps) {
  const [activeModal, setActiveModal] = useState<ModalKey>(null);

  // Summaries
  const pipelineStyleOverrides = (
    ["niche", "defaultQuality", "defaultMaxClips", "defaultMinScore", "defaultMaxDuration", "subtitles", "padBefore", "padAfter", "backgroundFillStyle", "captionMode"] as const
  ).filter((k) => settings[k] !== undefined).length
    + (settings.captionStyle ? Object.keys(settings.captionStyle).length : 0);

  const scoringOverrides = settings.scoringWeights ? Object.keys(settings.scoringWeights).length : 0;

  return (
    <div className="divide-y divide-border">
      {/* Pipeline & Style */}
      <div className="pb-4">
        <button
          onClick={() => setActiveModal("pipeline")}
          className="flex items-center gap-1 text-[13px] font-semibold text-foreground hover:text-accent transition-colors cursor-pointer"
        >
          <span>Pipeline & Style</span>
          <ChevronRight className="h-3.5 w-3.5 text-muted" />
        </button>
        <p className="text-[11px] text-muted leading-snug mt-0.5">
          Quality, clips, duration, captions, fill
        </p>
        <div className="mt-2.5 pl-3 space-y-1">
          <button
            onClick={() => setActiveModal("pipeline")}
            className="flex items-center gap-2 text-[12px] text-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>{pipelineStyleOverrides > 0 ? `${pipelineStyleOverrides} overrides` : "Using defaults"}</span>
          </button>
        </div>
      </div>

      {/* Scoring */}
      <div className="py-4">
        <button
          onClick={() => setActiveModal("scoring")}
          className="flex items-center gap-1 text-[13px] font-semibold text-foreground hover:text-accent transition-colors cursor-pointer"
        >
          <span>Scoring</span>
          <ChevronRight className="h-3.5 w-3.5 text-muted" />
        </button>
        <p className="text-[11px] text-muted leading-snug mt-0.5">
          AI viral criteria weights
        </p>
        <div className="mt-2.5 pl-3 space-y-1">
          <button
            onClick={() => setActiveModal("scoring")}
            className="flex items-center gap-2 text-[12px] text-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>{scoringOverrides > 0 ? `${scoringOverrides} custom weights` : "Default weights"}</span>
          </button>
        </div>
      </div>

      {/* Accounts */}
      <div className="py-4">
        <button
          onClick={() => setActiveModal("accounts")}
          className="flex items-center gap-1 text-[13px] font-semibold text-foreground hover:text-accent transition-colors cursor-pointer"
        >
          <span>Accounts</span>
          <ChevronRight className="h-3.5 w-3.5 text-muted" />
        </button>
        <p className="text-[11px] text-muted leading-snug mt-0.5">
          Publish destinations for clips
        </p>
        <div className="mt-2.5 pl-3 space-y-1">
          <button
            onClick={() => setActiveModal("accounts")}
            className="flex items-center gap-2 text-[12px] text-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <Radio className="h-3.5 w-3.5" />
            <span>{accounts.length > 0 ? `${accounts.length} connected` : "None selected"}</span>
          </button>
        </div>
      </div>

      {/* Creators */}
      <div className="py-4">
        <button
          onClick={() => setActiveModal("creators")}
          className="flex items-center gap-1 text-[13px] font-semibold text-foreground hover:text-accent transition-colors cursor-pointer"
        >
          <span>Creators</span>
          <ChevronRight className="h-3.5 w-3.5 text-muted" />
        </button>
        <p className="text-[11px] text-muted leading-snug mt-0.5">
          Auto-clip on new uploads
        </p>
        <div className="mt-2.5 pl-3 space-y-1">
          <button
            onClick={() => setActiveModal("creators")}
            className="flex items-center gap-2 text-[12px] text-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <Users className="h-3.5 w-3.5" />
            <span>{creators.length > 0 ? `${creators.length} assigned` : "None assigned"}</span>
          </button>
        </div>
      </div>

      {/* Scheduled Tasks */}
      <div className="pt-4">
        <Link
          href={`/calendar?space=${spaceId}`}
          className="flex items-center gap-2 pl-3 text-[12px] text-muted hover:text-foreground transition-colors"
        >
          <CalendarDays className="h-3.5 w-3.5" />
          <span>Scheduled Tasks</span>
        </Link>
      </div>

      {/* Modals */}
      <PipelineSettings
        open={activeModal === "pipeline"}
        onClose={() => setActiveModal(null)}
        spaceSettings={settings}
        globalSettings={globalSettings}
        onUpdate={onUpdateSettings}
      />

      <ScoringSettings
        open={activeModal === "scoring"}
        onClose={() => setActiveModal(null)}
        spaceSettings={settings}
        globalSettings={globalSettings}
        onUpdate={onUpdateSettings}
      />

      <AccountsSettings
        open={activeModal === "accounts"}
        onClose={() => setActiveModal(null)}
        accounts={accounts}
        onUpdateAccounts={onUpdateAccounts}
      />

      <CreatorsSettings
        open={activeModal === "creators"}
        onClose={() => setActiveModal(null)}
        creators={creators}
        onUpdateCreators={onUpdateCreators}
      />
    </div>
  );
}
