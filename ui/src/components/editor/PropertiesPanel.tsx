"use client";

import type { Item } from "./remotion/types";
import type { CaptionStyleState } from "./StyleControls";

/* ------------------------------------------------------------------ */
/*  Shared controls                                                    */
/* ------------------------------------------------------------------ */

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted whitespace-nowrap">{label}</span>
      <div className="flex-1 max-w-[160px]">{children}</div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h4 className="text-[11px] font-semibold text-foreground uppercase tracking-wider pt-3 first:pt-0">
      {title}
    </h4>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md bg-surface-2 border border-border/50 px-2 py-1 text-xs text-foreground"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const hex = value.slice(0, 7);
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={hex}
        onChange={(e) => onChange(e.target.value)}
        className="h-6 w-6 rounded cursor-pointer border border-border/50 flex-shrink-0"
      />
      <input
        type="text"
        value={value.toUpperCase()}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded-md bg-surface-2 border border-border/50 px-2 py-1 text-xs text-foreground font-mono"
      />
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      min={min}
      max={max}
      step={step}
      className="w-full rounded-md bg-surface-2 border border-border/50 px-2 py-1 text-xs text-foreground font-mono"
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Caption properties                                                 */
/* ------------------------------------------------------------------ */

function CaptionProperties({
  style,
  onChange,
}: {
  style: CaptionStyleState;
  onChange: (s: CaptionStyleState) => void;
}) {
  const update = (key: keyof CaptionStyleState, value: unknown) => {
    onChange({ ...style, [key]: value });
  };

  return (
    <>
      {/* Words section */}
      <SectionHeader title="Words" />
      <div className="space-y-2">
        <PropRow label="Words/Line">
          <Select
            value={String(style.maxWordsPerLine)}
            onChange={(v) => update("maxWordsPerLine", Number(v))}
            options={[
              { value: "2", label: "2" },
              { value: "3", label: "3" },
              { value: "4", label: "4" },
              { value: "5", label: "5" },
              { value: "6", label: "6" },
              { value: "7", label: "7" },
              { value: "8", label: "8" },
            ]}
          />
        </PropRow>
        <PropRow label="Position">
          <Select
            value={style.position}
            onChange={(v) => update("position", v)}
            options={[
              { value: "top", label: "Top" },
              { value: "center", label: "Center" },
              { value: "bottom", label: "Bottom" },
            ]}
          />
        </PropRow>
        <PropRow label="Animation">
          <Select
            value={style.animationPreset}
            onChange={(v) => update("animationPreset", v)}
            options={[
              { value: "karaoke-highlight", label: "Karaoke" },
              { value: "word-pop", label: "Word Pop" },
              { value: "typewriter", label: "Typewriter" },
              { value: "simple-fade", label: "Simple Fade" },
            ]}
          />
        </PropRow>
      </div>

      {/* Colors section */}
      <SectionHeader title="Colors" />
      <div className="space-y-2">
        <PropRow label="Active">
          <ColorInput
            value={style.activeColor}
            onChange={(v) => update("activeColor", v)}
          />
        </PropRow>
        <PropRow label="Inactive">
          <ColorInput
            value={style.inactiveColor}
            onChange={(v) => update("inactiveColor", v)}
          />
        </PropRow>
      </div>

      {/* Styles section */}
      <SectionHeader title="Styles" />
      <div className="space-y-2">
        <PropRow label="Font">
          <Select
            value={style.fontFamily}
            onChange={(v) => update("fontFamily", v)}
            options={[
              { value: "Arial", label: "Arial" },
              { value: "Impact", label: "Impact" },
              { value: "Helvetica", label: "Helvetica" },
              { value: "Montserrat", label: "Montserrat" },
              { value: "Roboto", label: "Roboto" },
            ]}
          />
        </PropRow>
        <PropRow label="Size">
          <NumberInput
            value={style.fontSize}
            onChange={(v) => update("fontSize", v)}
            min={32}
            max={120}
            step={4}
          />
        </PropRow>
      </div>

      {/* Font stroke section */}
      <SectionHeader title="Font Stroke" />
      <div className="space-y-2">
        <PropRow label="Color">
          <ColorInput
            value={style.outlineColor}
            onChange={(v) => update("outlineColor", v)}
          />
        </PropRow>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Hook properties                                                    */
/* ------------------------------------------------------------------ */

function HookProperties({
  style,
  onChange,
}: {
  style: CaptionStyleState;
  onChange: (s: CaptionStyleState) => void;
}) {
  const update = (key: keyof CaptionStyleState, value: unknown) => {
    onChange({ ...style, [key]: value });
  };

  return (
    <>
      <SectionHeader title="Hook Text" />
      <div className="space-y-2">
        <PropRow label="Color">
          <ColorInput
            value={style.hookColor}
            onChange={(v) => update("hookColor", v)}
          />
        </PropRow>
        <PropRow label="Size">
          <NumberInput
            value={style.hookFontSize}
            onChange={(v) => update("hookFontSize", v)}
            min={24}
            max={80}
            step={4}
          />
        </PropRow>
        <PropRow label="Position">
          <Select
            value={style.hookPosition}
            onChange={(v) => update("hookPosition", v)}
            options={[
              { value: "top", label: "Top" },
              { value: "center", label: "Center" },
            ]}
          />
        </PropRow>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Background properties                                              */
/* ------------------------------------------------------------------ */

function BackgroundProperties({
  bgStyle,
  onBgStyleChange,
}: {
  bgStyle: string;
  onBgStyleChange: (v: string) => void;
}) {
  return (
    <>
      <SectionHeader title="Background" />
      <div className="space-y-2">
        <PropRow label="Fill Style">
          <Select
            value={bgStyle}
            onChange={onBgStyleChange}
            options={[
              { value: "blurred-zoom", label: "Blurred Zoom" },
              { value: "mirror-reflection", label: "Mirror" },
              { value: "split-fill", label: "Split Fill" },
              { value: "center-crop", label: "Center Crop" },
            ]}
          />
        </PropRow>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Main panel                                                         */
/* ------------------------------------------------------------------ */

interface PropertiesPanelProps {
  selectedItem: Item | null;
  captionStyle: CaptionStyleState;
  bgStyle: string;
  onStyleChange: (style: CaptionStyleState) => void;
  onBgStyleChange: (bg: string) => void;
}

export function PropertiesPanel({
  selectedItem,
  captionStyle,
  bgStyle,
  onStyleChange,
  onBgStyleChange,
}: PropertiesPanelProps) {
  if (!selectedItem) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-6 text-muted">
        <p className="text-xs">Select an item on the timeline to edit its properties</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2 overflow-y-auto h-full">
      {selectedItem.type === "caption" && (
        <CaptionProperties style={captionStyle} onChange={onStyleChange} />
      )}

      {selectedItem.type === "hook" && (
        <HookProperties style={captionStyle} onChange={onStyleChange} />
      )}

      {(selectedItem.type === "background" || selectedItem.type === "video") && (
        <BackgroundProperties bgStyle={bgStyle} onBgStyleChange={onBgStyleChange} />
      )}
    </div>
  );
}
