"use client";

import { Card } from "@/components/ui/card";

export interface CaptionStyleState {
  fontFamily: string;
  fontSize: number;
  activeColor: string;
  inactiveColor: string;
  outlineColor: string;
  position: "top" | "center" | "bottom";
  maxWordsPerLine: number;
  animationPreset: "karaoke-highlight" | "word-pop" | "typewriter" | "simple-fade";
  hookFontSize: number;
  hookColor: string;
  hookBgColor: string;
  hookPosition: "top" | "center";
}

interface StyleControlsProps {
  style: CaptionStyleState;
  bgStyle: string;
  onChange: (style: CaptionStyleState) => void;
  onBgStyleChange: (style: string) => void;
}

export function StyleControls({ style, bgStyle, onChange, onBgStyleChange }: StyleControlsProps) {
  const update = (key: keyof CaptionStyleState, value: unknown) => {
    onChange({ ...style, [key]: value });
  };

  return (
    <div className="space-y-4 overflow-y-auto max-h-[60vh]">
      {/* Background Fill */}
      <Card className="space-y-2 !p-3">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Background</h3>
        <select
          value={bgStyle}
          onChange={(e) => onBgStyleChange(e.target.value)}
          className="w-full rounded bg-surface-2 border border-border px-2 py-1.5 text-xs text-foreground"
        >
          <option value="blurred-zoom">Blurred Zoom</option>
          <option value="mirror-reflection">Mirror Reflection</option>
          <option value="split-fill">Split Fill</option>
          <option value="center-crop">Center Crop</option>
        </select>
      </Card>

      {/* Caption Colors */}
      <Card className="space-y-2 !p-3">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Caption Colors</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs text-muted">Active</label>
            <input
              type="color"
              value={style.activeColor}
              onChange={(e) => update("activeColor", e.target.value)}
              className="h-7 w-full rounded cursor-pointer"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted">Inactive</label>
            <input
              type="color"
              value={style.inactiveColor.slice(0, 7)}
              onChange={(e) => update("inactiveColor", e.target.value + "99")}
              className="h-7 w-full rounded cursor-pointer"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted">Outline</label>
            <input
              type="color"
              value={style.outlineColor}
              onChange={(e) => update("outlineColor", e.target.value)}
              className="h-7 w-full rounded cursor-pointer"
            />
          </div>
        </div>
      </Card>

      {/* Caption Font */}
      <Card className="space-y-2 !p-3">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Font</h3>
        <select
          value={style.fontFamily}
          onChange={(e) => update("fontFamily", e.target.value)}
          className="w-full rounded bg-surface-2 border border-border px-2 py-1.5 text-xs text-foreground"
        >
          <option value="Arial">Arial</option>
          <option value="Impact">Impact</option>
          <option value="Helvetica">Helvetica</option>
          <option value="Montserrat">Montserrat</option>
          <option value="Roboto">Roboto</option>
        </select>
        <div className="space-y-1">
          <label className="text-xs text-muted">Size: {style.fontSize}</label>
          <input
            type="range"
            min={32}
            max={120}
            step={4}
            value={style.fontSize}
            onChange={(e) => update("fontSize", Number(e.target.value))}
            className="w-full accent-[var(--color-accent)]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted">Words/Line: {style.maxWordsPerLine}</label>
          <input
            type="range"
            min={2}
            max={8}
            value={style.maxWordsPerLine}
            onChange={(e) => update("maxWordsPerLine", Number(e.target.value))}
            className="w-full accent-[var(--color-accent)]"
          />
        </div>
      </Card>

      {/* Position & Animation */}
      <Card className="space-y-2 !p-3">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Position & Animation</h3>
        <div className="space-y-1">
          <label className="text-xs text-muted">Position</label>
          <div className="flex gap-1">
            {(["top", "center", "bottom"] as const).map((pos) => (
              <button
                key={pos}
                onClick={() => update("position", pos)}
                className={`flex-1 rounded px-2 py-1 text-xs font-medium capitalize transition-colors ${
                  style.position === pos
                    ? "bg-accent text-white"
                    : "bg-surface-2 text-muted hover:text-foreground"
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted">Animation</label>
          <select
            value={style.animationPreset}
            onChange={(e) => update("animationPreset", e.target.value)}
            className="w-full rounded bg-surface-2 border border-border px-2 py-1.5 text-xs text-foreground"
          >
            <option value="karaoke-highlight">Karaoke Highlight</option>
            <option value="word-pop">Word Pop</option>
            <option value="typewriter">Typewriter</option>
            <option value="simple-fade">Simple Fade</option>
          </select>
        </div>
      </Card>

      {/* Hook Text */}
      <Card className="space-y-2 !p-3">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Hook Text</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs text-muted">Color</label>
            <input
              type="color"
              value={style.hookColor}
              onChange={(e) => update("hookColor", e.target.value)}
              className="h-7 w-full rounded cursor-pointer"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted">Size: {style.hookFontSize}</label>
            <input
              type="range"
              min={24}
              max={80}
              step={4}
              value={style.hookFontSize}
              onChange={(e) => update("hookFontSize", Number(e.target.value))}
              className="w-full accent-[var(--color-accent)]"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted">Hook Position</label>
          <div className="flex gap-1">
            {(["top", "center"] as const).map((pos) => (
              <button
                key={pos}
                onClick={() => update("hookPosition", pos)}
                className={`flex-1 rounded px-2 py-1 text-xs font-medium capitalize transition-colors ${
                  style.hookPosition === pos
                    ? "bg-accent text-white"
                    : "bg-surface-2 text-muted hover:text-foreground"
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
