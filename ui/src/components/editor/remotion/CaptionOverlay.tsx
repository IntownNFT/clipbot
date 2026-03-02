"use client";

import React from "react";
import { CaptionWord } from "./CaptionWord";

export interface WordTiming {
  word: string;
  startMs: number;
  endMs: number;
}

interface CaptionOverlayProps {
  words: WordTiming[];
  currentTimeMs: number;
  maxWordsPerLine?: number;
  fontSize?: number;
  fontFamily?: string;
  position?: "top" | "center" | "bottom";
  activeColor?: string;
  inactiveColor?: string;
  animationPreset?: "karaoke-highlight" | "word-pop" | "typewriter" | "simple-fade";
}

/**
 * Player-compatible caption overlay.
 * Receives currentTimeMs from parent (via Player's frame callback).
 */
export const CaptionOverlay: React.FC<CaptionOverlayProps> = ({
  words,
  currentTimeMs,
  maxWordsPerLine = 5,
  fontSize = 56,
  fontFamily = "Arial Black, sans-serif",
  position = "bottom",
  activeColor,
  inactiveColor,
  animationPreset,
}) => {
  // Group words into pages
  const pages: WordTiming[][] = [];
  for (let i = 0; i < words.length; i += maxWordsPerLine) {
    pages.push(words.slice(i, i + maxWordsPerLine));
  }

  // Find current page based on time
  const currentPage = pages.find((page) => {
    const pageStart = page[0]?.startMs ?? 0;
    const pageEnd = page[page.length - 1]?.endMs ?? 0;
    return currentTimeMs >= pageStart && currentTimeMs <= pageEnd + 300;
  });

  if (!currentPage) return null;

  const positionStyle = (() => {
    switch (position) {
      case "top": return { top: "12%", bottom: "auto" };
      case "center": return { top: "50%", bottom: "auto", transform: "translateY(-50%)" };
      case "bottom":
      default: return { bottom: "18%", top: "auto" };
    }
  })();

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        ...positionStyle,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: "90%",
          fontSize,
          fontFamily,
          lineHeight: 1.4,
        }}
      >
        {currentPage.map((word, i) => {
          const isActive =
            currentTimeMs >= word.startMs && currentTimeMs <= word.endMs + 200;
          return (
            <CaptionWord
              key={`${word.startMs}-${i}`}
              text={word.word}
              active={isActive}
              activeColor={activeColor}
              inactiveColor={inactiveColor}
              animationPreset={animationPreset}
            />
          );
        })}
      </div>
    </div>
  );
};
