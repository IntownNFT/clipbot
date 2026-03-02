"use client";

import {
  Trash2,
  Scissors,
  Copy,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  ZoomIn,
  ZoomOut,
  Save,
  Loader2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatTime(frame: number, fps: number): string {
  const totalSeconds = Math.floor(frame / fps);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function TBtn({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.FC<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
        disabled
          ? "opacity-30 pointer-events-none text-muted"
          : "text-muted hover:text-foreground hover:bg-surface-2"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Transport bar                                                      */
/* ------------------------------------------------------------------ */

interface TransportBarProps {
  isPlaying: boolean;
  currentFrame: number;
  durationInFrames: number;
  fps: number;
  onToggle: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
  onSplit: () => void;
  onDelete: () => void;
  onClone: () => void;
  canSplit: boolean;
  canDelete: boolean;
  canClone: boolean;
  zoom: number;
  onZoomChange: (z: number) => void;
  onRerender: () => void;
  rerendering: boolean;
}

export function TransportBar({
  isPlaying,
  currentFrame,
  durationInFrames,
  fps,
  onToggle,
  onSkipBack,
  onSkipForward,
  onSplit,
  onDelete,
  onClone,
  canSplit,
  canDelete,
  canClone,
  zoom,
  onZoomChange,
  onRerender,
  rerendering,
}: TransportBarProps) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-t border-border/50 bg-surface-1 flex-shrink-0 gap-2">
      {/* Left: edit actions */}
      <div className="flex items-center gap-0.5">
        <TBtn icon={Trash2} label="Delete" onClick={onDelete} disabled={!canDelete} />
        <TBtn icon={Scissors} label="Split" onClick={onSplit} disabled={!canSplit} />
        <TBtn icon={Copy} label="Clone" onClick={onClone} disabled={!canClone} />
      </div>

      {/* Center: playback */}
      <div className="flex items-center gap-1">
        <button
          onClick={onSkipBack}
          className="h-7 w-7 rounded-md flex items-center justify-center text-muted hover:text-foreground hover:bg-surface-2 transition-colors cursor-pointer"
        >
          <SkipBack className="h-3.5 w-3.5" />
        </button>

        <button
          onClick={onToggle}
          className="h-8 w-8 rounded-full flex items-center justify-center bg-foreground text-surface-0 hover:bg-foreground/90 transition-colors cursor-pointer"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 ml-0.5" />
          )}
        </button>

        <button
          onClick={onSkipForward}
          className="h-7 w-7 rounded-md flex items-center justify-center text-muted hover:text-foreground hover:bg-surface-2 transition-colors cursor-pointer"
        >
          <SkipForward className="h-3.5 w-3.5" />
        </button>

        <span className="text-[11px] font-mono text-muted ml-2 tabular-nums">
          {formatTime(currentFrame, fps)}
          <span className="text-border mx-1">/</span>
          {formatTime(durationInFrames, fps)}
        </span>
      </div>

      {/* Right: zoom + render */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onZoomChange(Math.max(0.5, zoom - 0.5))}
          className="h-6 w-6 rounded flex items-center justify-center text-muted hover:text-foreground hover:bg-surface-2 transition-colors cursor-pointer"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <input
          type="range"
          min={0.5}
          max={5}
          step={0.25}
          value={zoom}
          onChange={(e) => onZoomChange(Number(e.target.value))}
          className="w-16 accent-foreground h-1"
        />
        <button
          onClick={() => onZoomChange(Math.min(5, zoom + 0.5))}
          className="h-6 w-6 rounded flex items-center justify-center text-muted hover:text-foreground hover:bg-surface-2 transition-colors cursor-pointer"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>

        <div className="w-px h-4 bg-border/40 mx-1" />

        <button
          onClick={onRerender}
          disabled={rerendering}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
            rerendering
              ? "opacity-50 pointer-events-none bg-surface-2 text-muted"
              : "bg-accent text-white hover:bg-accent/90"
          }`}
        >
          {rerendering ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Save className="h-3 w-3" />
          )}
          {rerendering ? "..." : "Export"}
        </button>
      </div>
    </div>
  );
}
