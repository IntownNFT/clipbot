"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { Main } from "./remotion/PlayerComposition";
import type { Track } from "./remotion/types";

interface RemotionPreviewProps {
  tracks: Track[];
  durationInFrames: number;
  fps: number;
  onFrameChange?: (frame: number) => void;
  onPlayingChange?: (playing: boolean) => void;
  playerRef?: React.MutableRefObject<PlayerRef | null>;
}

export const RemotionPreview: React.FC<RemotionPreviewProps> = ({
  tracks,
  durationInFrames,
  fps,
  onFrameChange,
  onPlayingChange,
  playerRef: externalRef,
}) => {
  const localRef = useRef<PlayerRef | null>(null);

  const setRef = useCallback(
    (node: PlayerRef | null) => {
      localRef.current = node;
      if (externalRef) externalRef.current = node;
    },
    [externalRef]
  );

  // Poll current frame + playing state for timeline sync
  useEffect(() => {
    const interval = setInterval(() => {
      if (!localRef.current) return;
      const frame = localRef.current.getCurrentFrame();
      if (frame !== undefined) onFrameChange?.(frame);
      try {
        const playing = localRef.current.isPlaying();
        onPlayingChange?.(playing);
      } catch {
        // isPlaying may not be available in all versions
      }
    }, 50);
    return () => clearInterval(interval);
  }, [onFrameChange, onPlayingChange]);

  const inputProps = { tracks };

  return (
    <div className="h-full flex items-center justify-center">
      <div
        className="rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10"
        style={{ height: "100%", maxHeight: "100%", aspectRatio: "9/16" }}
      >
        <Player
          ref={setRef}
          component={Main as unknown as React.ComponentType<Record<string, unknown>>}
          inputProps={inputProps as unknown as Record<string, unknown>}
          durationInFrames={durationInFrames}
          fps={fps}
          compositionWidth={1080}
          compositionHeight={1920}
          style={{ width: "100%", height: "100%" }}
          loop
          autoPlay={false}
        />
      </div>
    </div>
  );
};
