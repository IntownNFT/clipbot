"use client";

import type { SpaceSettings } from "@/lib/types";
import type { AppSettings } from "@/lib/types";
import { DEFAULT_CAPTION_STYLE } from "@/lib/types";
import { SpacePanelModal } from "../SpacePanelModal";
import { OverrideField } from "./OverrideField";

const selectClass =
  "w-full rounded-lg bg-surface-2 border border-border px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-200";

interface PipelineSettingsProps {
  open: boolean;
  onClose: () => void;
  spaceSettings: SpaceSettings;
  globalSettings: AppSettings;
  onUpdate: (patch: Partial<SpaceSettings>) => void;
}

export function PipelineSettings({
  open,
  onClose,
  spaceSettings,
  globalSettings,
  onUpdate,
}: PipelineSettingsProps) {
  const g = globalSettings;
  const s = spaceSettings;
  const gc = g.captionStyle ?? DEFAULT_CAPTION_STYLE;
  const sc = s.captionStyle ?? {};

  const updateCaption = (key: string, value: unknown) => {
    onUpdate({ captionStyle: { ...sc, [key]: value } });
  };

  const resetCaption = (key: string) => {
    const next = { ...sc };
    delete (next as Record<string, unknown>)[key];
    if (Object.keys(next).length === 0) {
      onUpdate({ captionStyle: undefined });
    } else {
      onUpdate({ captionStyle: next });
    }
  };

  return (
    <SpacePanelModal open={open} onClose={onClose} title="Pipeline & Style" size="lg">
      <div className="space-y-5">
        {/* Pipeline */}
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Pipeline</h3>
        <div className="grid grid-cols-2 gap-4">
          <OverrideField
            label="Quality"
            isOverridden={s.defaultQuality !== undefined}
            globalDefault={g.defaultQuality ?? "1080"}
            onReset={() => onUpdate({ defaultQuality: undefined })}
          >
            <select
              value={s.defaultQuality ?? g.defaultQuality ?? "1080"}
              onChange={(e) => onUpdate({ defaultQuality: e.target.value })}
              className={selectClass}
            >
              <option value="2160">4K (2160p)</option>
              <option value="1080">1080p</option>
              <option value="720">720p</option>
              <option value="480">480p</option>
            </select>
          </OverrideField>

          <OverrideField
            label="Niche"
            isOverridden={s.niche !== undefined}
            globalDefault={g.niche ?? "cannabis"}
            onReset={() => onUpdate({ niche: undefined })}
          >
            <select
              value={s.niche ?? g.niche ?? "cannabis"}
              onChange={(e) => onUpdate({ niche: e.target.value })}
              className={selectClass}
            >
              <option value="cannabis">Cannabis</option>
              <option value="general">General</option>
              <option value="tech">Tech</option>
              <option value="fitness">Fitness</option>
              <option value="cooking">Cooking</option>
            </select>
          </OverrideField>

          <OverrideField
            label={`Max Clips: ${s.defaultMaxClips ?? g.defaultMaxClips ?? 5}`}
            isOverridden={s.defaultMaxClips !== undefined}
            globalDefault={String(g.defaultMaxClips ?? 5)}
            onReset={() => onUpdate({ defaultMaxClips: undefined })}
          >
            <input
              type="range"
              min={1}
              max={15}
              value={s.defaultMaxClips ?? g.defaultMaxClips ?? 5}
              onChange={(e) => onUpdate({ defaultMaxClips: Number(e.target.value) })}
              className="w-full accent-[var(--color-accent)]"
            />
          </OverrideField>

          <OverrideField
            label={`Min Score: ${s.defaultMinScore ?? g.defaultMinScore ?? 7}`}
            isOverridden={s.defaultMinScore !== undefined}
            globalDefault={String(g.defaultMinScore ?? 7)}
            onReset={() => onUpdate({ defaultMinScore: undefined })}
          >
            <input
              type="range"
              min={1}
              max={10}
              value={s.defaultMinScore ?? g.defaultMinScore ?? 7}
              onChange={(e) => onUpdate({ defaultMinScore: Number(e.target.value) })}
              className="w-full accent-[var(--color-accent)]"
            />
          </OverrideField>

          <OverrideField
            label={`Max Duration: ${s.defaultMaxDuration ?? g.defaultMaxDuration ?? 59}s`}
            isOverridden={s.defaultMaxDuration !== undefined}
            globalDefault={`${g.defaultMaxDuration ?? 59}s`}
            onReset={() => onUpdate({ defaultMaxDuration: undefined })}
          >
            <input
              type="range"
              min={15}
              max={180}
              step={5}
              value={s.defaultMaxDuration ?? g.defaultMaxDuration ?? 59}
              onChange={(e) => onUpdate({ defaultMaxDuration: Number(e.target.value) })}
              className="w-full accent-[var(--color-accent)]"
            />
          </OverrideField>

          <OverrideField
            label={`Pad Before: ${s.padBefore ?? g.padBefore ?? 1.5}s`}
            isOverridden={s.padBefore !== undefined}
            globalDefault={`${g.padBefore ?? 1.5}s`}
            onReset={() => onUpdate({ padBefore: undefined })}
          >
            <input
              type="range"
              min={0}
              max={5}
              step={0.5}
              value={s.padBefore ?? g.padBefore ?? 1.5}
              onChange={(e) => onUpdate({ padBefore: Number(e.target.value) })}
              className="w-full accent-[var(--color-accent)]"
            />
          </OverrideField>

          <OverrideField
            label={`Pad After: ${s.padAfter ?? g.padAfter ?? 0.5}s`}
            isOverridden={s.padAfter !== undefined}
            globalDefault={`${g.padAfter ?? 0.5}s`}
            onReset={() => onUpdate({ padAfter: undefined })}
          >
            <input
              type="range"
              min={0}
              max={5}
              step={0.5}
              value={s.padAfter ?? g.padAfter ?? 0.5}
              onChange={(e) => onUpdate({ padAfter: Number(e.target.value) })}
              className="w-full accent-[var(--color-accent)]"
            />
          </OverrideField>

          <OverrideField
            label="Subtitles"
            isOverridden={s.subtitles !== undefined}
            globalDefault={g.subtitles !== false ? "On" : "Off"}
            onReset={() => onUpdate({ subtitles: undefined })}
          >
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={s.subtitles ?? g.subtitles ?? true}
                onChange={(e) => onUpdate({ subtitles: e.target.checked })}
                className="accent-[var(--color-accent)]"
              />
              Burn subtitles
            </label>
          </OverrideField>
        </div>

        <div className="h-px bg-border/50" />

        {/* Background + Caption Mode */}
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Style</h3>
        <div className="grid grid-cols-2 gap-4">
          <OverrideField
            label="Background Fill"
            isOverridden={s.backgroundFillStyle !== undefined}
            globalDefault={g.backgroundFillStyle ?? "blurred-zoom"}
            onReset={() => onUpdate({ backgroundFillStyle: undefined })}
          >
            <select
              value={s.backgroundFillStyle ?? g.backgroundFillStyle ?? "blurred-zoom"}
              onChange={(e) => onUpdate({ backgroundFillStyle: e.target.value as SpaceSettings["backgroundFillStyle"] })}
              className={selectClass}
            >
              <option value="blurred-zoom">Blurred Zoom</option>
              <option value="mirror-reflection">Mirror</option>
              <option value="split-fill">Split Fill</option>
              <option value="center-crop">Center Crop</option>
            </select>
          </OverrideField>

          <OverrideField
            label="Caption Mode"
            isOverridden={s.captionMode !== undefined}
            globalDefault={g.captionMode ?? "overlay"}
            onReset={() => onUpdate({ captionMode: undefined })}
          >
            <select
              value={s.captionMode ?? g.captionMode ?? "overlay"}
              onChange={(e) => onUpdate({ captionMode: e.target.value as SpaceSettings["captionMode"] })}
              className={selectClass}
            >
              <option value="overlay">Overlay</option>
              <option value="burn-in">Burn-in</option>
            </select>
          </OverrideField>
        </div>

        <div className="h-px bg-border/50" />

        {/* Caption Styling */}
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Caption Styling</h3>
        <div className="grid grid-cols-2 gap-4">
          <OverrideField
            label="Font Family"
            isOverridden={sc.fontFamily !== undefined}
            globalDefault={gc.fontFamily}
            onReset={() => resetCaption("fontFamily")}
          >
            <select
              value={sc.fontFamily ?? gc.fontFamily}
              onChange={(e) => updateCaption("fontFamily", e.target.value)}
              className={selectClass}
            >
              <option value="Arial">Arial</option>
              <option value="Impact">Impact</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Montserrat">Montserrat</option>
              <option value="Roboto">Roboto</option>
              <option value="Comic Sans MS">Comic Sans MS</option>
            </select>
          </OverrideField>

          <OverrideField
            label={`Font Size: ${sc.fontSize ?? gc.fontSize}`}
            isOverridden={sc.fontSize !== undefined}
            globalDefault={String(gc.fontSize)}
            onReset={() => resetCaption("fontSize")}
          >
            <input
              type="range"
              min={32}
              max={120}
              step={4}
              value={sc.fontSize ?? gc.fontSize}
              onChange={(e) => updateCaption("fontSize", Number(e.target.value))}
              className="w-full accent-[var(--color-accent)]"
            />
          </OverrideField>

          <OverrideField
            label="Active Color"
            isOverridden={sc.activeColor !== undefined}
            globalDefault={gc.activeColor}
            onReset={() => resetCaption("activeColor")}
          >
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={sc.activeColor ?? gc.activeColor}
                onChange={(e) => updateCaption("activeColor", e.target.value)}
                className="h-7 w-7 rounded cursor-pointer"
              />
              <span className="text-[10px] text-muted font-mono">{sc.activeColor ?? gc.activeColor}</span>
            </div>
          </OverrideField>

          <OverrideField
            label="Inactive Color"
            isOverridden={sc.inactiveColor !== undefined}
            globalDefault={gc.inactiveColor}
            onReset={() => resetCaption("inactiveColor")}
          >
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={(sc.inactiveColor ?? gc.inactiveColor).slice(0, 7)}
                onChange={(e) => updateCaption("inactiveColor", e.target.value + "99")}
                className="h-7 w-7 rounded cursor-pointer"
              />
              <span className="text-[10px] text-muted font-mono">{sc.inactiveColor ?? gc.inactiveColor}</span>
            </div>
          </OverrideField>

          <OverrideField
            label="Outline Color"
            isOverridden={sc.outlineColor !== undefined}
            globalDefault={gc.outlineColor}
            onReset={() => resetCaption("outlineColor")}
          >
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={sc.outlineColor ?? gc.outlineColor}
                onChange={(e) => updateCaption("outlineColor", e.target.value)}
                className="h-7 w-7 rounded cursor-pointer"
              />
              <span className="text-[10px] text-muted font-mono">{sc.outlineColor ?? gc.outlineColor}</span>
            </div>
          </OverrideField>

          <OverrideField
            label="Caption Position"
            isOverridden={sc.position !== undefined}
            globalDefault={gc.position}
            onReset={() => resetCaption("position")}
          >
            <div className="flex gap-2">
              {(["top", "center", "bottom"] as const).map((pos) => (
                <label key={pos} className="flex items-center gap-1 text-xs cursor-pointer capitalize">
                  <input
                    type="radio"
                    name="spaceCaptionPos"
                    value={pos}
                    checked={(sc.position ?? gc.position) === pos}
                    onChange={() => updateCaption("position", pos)}
                    className="accent-[var(--color-accent)]"
                  />
                  {pos}
                </label>
              ))}
            </div>
          </OverrideField>

          <OverrideField
            label={`Words/Line: ${sc.maxWordsPerLine ?? gc.maxWordsPerLine}`}
            isOverridden={sc.maxWordsPerLine !== undefined}
            globalDefault={String(gc.maxWordsPerLine)}
            onReset={() => resetCaption("maxWordsPerLine")}
          >
            <input
              type="range"
              min={2}
              max={8}
              value={sc.maxWordsPerLine ?? gc.maxWordsPerLine}
              onChange={(e) => updateCaption("maxWordsPerLine", Number(e.target.value))}
              className="w-full accent-[var(--color-accent)]"
            />
          </OverrideField>

          <OverrideField
            label="Animation"
            isOverridden={sc.animationPreset !== undefined}
            globalDefault={gc.animationPreset}
            onReset={() => resetCaption("animationPreset")}
          >
            <select
              value={sc.animationPreset ?? gc.animationPreset}
              onChange={(e) => updateCaption("animationPreset", e.target.value)}
              className={selectClass}
            >
              <option value="karaoke-highlight">Karaoke Highlight</option>
              <option value="word-pop">Word Pop</option>
              <option value="typewriter">Typewriter</option>
              <option value="simple-fade">Simple Fade</option>
            </select>
          </OverrideField>
        </div>

        <div className="h-px bg-border/50" />

        {/* Hook Text */}
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Hook Text</h3>
        <div className="grid grid-cols-2 gap-4">
          <OverrideField
            label={`Hook Size: ${sc.hookFontSize ?? gc.hookFontSize}`}
            isOverridden={sc.hookFontSize !== undefined}
            globalDefault={String(gc.hookFontSize)}
            onReset={() => resetCaption("hookFontSize")}
          >
            <input
              type="range"
              min={24}
              max={80}
              step={4}
              value={sc.hookFontSize ?? gc.hookFontSize}
              onChange={(e) => updateCaption("hookFontSize", Number(e.target.value))}
              className="w-full accent-[var(--color-accent)]"
            />
          </OverrideField>

          <OverrideField
            label="Hook Color"
            isOverridden={sc.hookColor !== undefined}
            globalDefault={gc.hookColor}
            onReset={() => resetCaption("hookColor")}
          >
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={sc.hookColor ?? gc.hookColor}
                onChange={(e) => updateCaption("hookColor", e.target.value)}
                className="h-7 w-7 rounded cursor-pointer"
              />
              <span className="text-[10px] text-muted font-mono">{sc.hookColor ?? gc.hookColor}</span>
            </div>
          </OverrideField>

          <OverrideField
            label="Hook BG Color"
            isOverridden={sc.hookBgColor !== undefined}
            globalDefault={gc.hookBgColor}
            onReset={() => resetCaption("hookBgColor")}
          >
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={(sc.hookBgColor ?? gc.hookBgColor).startsWith("rgba") ? "#000000" : (sc.hookBgColor ?? gc.hookBgColor)}
                onChange={(e) => updateCaption("hookBgColor", e.target.value)}
                className="h-7 w-7 rounded cursor-pointer"
              />
              <span className="text-[10px] text-muted font-mono">{sc.hookBgColor ?? gc.hookBgColor}</span>
            </div>
          </OverrideField>

          <OverrideField
            label="Hook Position"
            isOverridden={sc.hookPosition !== undefined}
            globalDefault={gc.hookPosition}
            onReset={() => resetCaption("hookPosition")}
          >
            <div className="flex gap-2">
              {(["top", "center"] as const).map((pos) => (
                <label key={pos} className="flex items-center gap-1 text-xs cursor-pointer capitalize">
                  <input
                    type="radio"
                    name="spaceHookPos"
                    value={pos}
                    checked={(sc.hookPosition ?? gc.hookPosition) === pos}
                    onChange={() => updateCaption("hookPosition", pos)}
                    className="accent-[var(--color-accent)]"
                  />
                  {pos}
                </label>
              ))}
            </div>
          </OverrideField>
        </div>
      </div>
    </SpacePanelModal>
  );
}
