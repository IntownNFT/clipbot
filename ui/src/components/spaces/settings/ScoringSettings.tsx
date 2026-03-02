"use client";

import type { SpaceSettings } from "@/lib/types";
import type { AppSettings, ScoringWeights } from "@/lib/types";
import { DEFAULT_SCORING_WEIGHTS } from "@/lib/types";
import { SpacePanelModal } from "../SpacePanelModal";
import { OverrideField } from "./OverrideField";

interface ScoringSettingsProps {
  open: boolean;
  onClose: () => void;
  spaceSettings: SpaceSettings;
  globalSettings: AppSettings;
  onUpdate: (patch: Partial<SpaceSettings>) => void;
}

export function ScoringSettings({
  open,
  onClose,
  spaceSettings,
  globalSettings,
  onUpdate,
}: ScoringSettingsProps) {
  const gw = globalSettings.scoringWeights ?? DEFAULT_SCORING_WEIGHTS;
  const sw = spaceSettings.scoringWeights ?? {};

  const updateWeight = (key: keyof ScoringWeights, value: number) => {
    onUpdate({ scoringWeights: { ...sw, [key]: value } });
  };

  const resetWeight = (key: keyof ScoringWeights) => {
    const next = { ...sw };
    delete next[key];
    if (Object.keys(next).length === 0) {
      onUpdate({ scoringWeights: undefined });
    } else {
      onUpdate({ scoringWeights: next });
    }
  };

  const primary: { key: keyof ScoringWeights; label: string; desc: string }[] = [
    { key: "hook", label: "Strong Hook", desc: "First 2 seconds grab attention" },
    { key: "standalone", label: "Standalone Value", desc: "Makes sense without context" },
    { key: "controversy", label: "Controversy/Debate", desc: "Polarizing opinions, hot takes" },
    { key: "education", label: "Educational Nuggets", desc: "\"I didn't know that\" moments" },
  ];

  const secondary: { key: keyof ScoringWeights; label: string; desc: string }[] = [
    { key: "emotion", label: "Emotional Peaks", desc: "Genuine excitement, shock, passion" },
    { key: "twist", label: "Unexpected Twists", desc: "Surprising reveals, counterintuitive facts" },
  ];

  const tertiary: { key: keyof ScoringWeights; label: string; desc: string }[] = [
    { key: "quotable", label: "Quotable Lines", desc: "Memorable one-liners people share" },
    { key: "visual", label: "Visual Cue Potential", desc: "Visually impressive moments" },
  ];

  const renderGroup = (items: typeof primary) =>
    items.map((item) => (
      <OverrideField
        key={item.key}
        label={`${item.label}: ${sw[item.key] ?? gw[item.key]}x`}
        isOverridden={sw[item.key] !== undefined}
        globalDefault={`${gw[item.key]}x`}
        onReset={() => resetWeight(item.key)}
      >
        <input
          type="range"
          min={0}
          max={5}
          step={0.5}
          value={sw[item.key] ?? gw[item.key]}
          onChange={(e) => updateWeight(item.key, Number(e.target.value))}
          className="w-full accent-[var(--color-accent)]"
        />
        <p className="text-[10px] text-muted">{item.desc}</p>
      </OverrideField>
    ));

  return (
    <SpacePanelModal open={open} onClose={onClose} title="Scoring Weights" size="md">
      <div className="space-y-4">
        <p className="text-xs text-muted">
          Override how the AI prioritizes viral criteria for this space.
        </p>

        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Primary Criteria</h3>
        <div className="grid grid-cols-2 gap-4">
          {renderGroup(primary)}
        </div>

        <div className="h-px bg-border/50" />

        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Secondary Criteria</h3>
        <div className="grid grid-cols-2 gap-4">
          {renderGroup(secondary)}
        </div>

        <div className="h-px bg-border/50" />

        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Tertiary Criteria</h3>
        <div className="grid grid-cols-2 gap-4">
          {renderGroup(tertiary)}
        </div>

        <div className="h-px bg-border/50" />

        <OverrideField
          label={`Niche Bonus: +${sw.nicheBonus ?? gw.nicheBonus}`}
          isOverridden={sw.nicheBonus !== undefined}
          globalDefault={`+${gw.nicheBonus}`}
          onReset={() => resetWeight("nicheBonus")}
        >
          <input
            type="range"
            min={0}
            max={3}
            step={0.5}
            value={sw.nicheBonus ?? gw.nicheBonus}
            onChange={(e) => updateWeight("nicheBonus", Number(e.target.value))}
            className="w-full accent-[var(--color-accent)]"
          />
          <p className="text-[10px] text-muted">
            Bonus points for niche-specific criteria
          </p>
        </OverrideField>
      </div>
    </SpacePanelModal>
  );
}
