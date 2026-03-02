"use client";

import React from "react";

interface CaptionWordProps {
  text: string;
  active: boolean;
  activeColor?: string;
  inactiveColor?: string;
  animationPreset?: "karaoke-highlight" | "word-pop" | "typewriter" | "simple-fade";
}

/**
 * Player-compatible caption word component.
 * Uses CSS transitions instead of Remotion's useCurrentFrame for in-browser preview.
 */
export const CaptionWord: React.FC<CaptionWordProps> = ({
  text,
  active,
  activeColor = "#FFD700",
  inactiveColor = "rgba(255, 255, 255, 0.6)",
  animationPreset = "karaoke-highlight",
}) => {
  let scale = 1;
  let opacity = 1;

  switch (animationPreset) {
    case "word-pop":
      scale = active ? 1.15 : 1;
      break;
    case "typewriter":
      opacity = active ? 1 : 0.4;
      break;
    case "simple-fade":
      opacity = active ? 1 : 0.5;
      break;
    case "karaoke-highlight":
    default:
      scale = active ? 1.1 : 1;
      break;
  }

  return (
    <span
      style={{
        display: "inline-block",
        color: active ? activeColor : inactiveColor,
        transform: `scale(${scale})`,
        opacity,
        textShadow: active
          ? `0 0 20px ${activeColor}80, 2px 2px 4px rgba(0, 0, 0, 0.8)`
          : "2px 2px 4px rgba(0, 0, 0, 0.8)",
        transition: "all 0.15s ease-out",
        marginRight: "0.3em",
        fontWeight: 900,
      }}
    >
      {text}
    </span>
  );
};
