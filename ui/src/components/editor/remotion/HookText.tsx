"use client";

import React from "react";

interface HookTextProps {
  text: string;
  visible: boolean;
  hookColor?: string;
  hookBgColor?: string;
  hookFontSize?: number;
  hookPosition?: "top" | "center";
}

/**
 * Player-compatible hook text overlay.
 * Visibility controlled by parent based on current time.
 */
export const HookText: React.FC<HookTextProps> = ({
  text,
  visible,
  hookColor = "#FFFFFF",
  hookBgColor = "rgba(0, 0, 0, 0.7)",
  hookFontSize = 48,
  hookPosition = "top",
}) => {
  const positionStyle = hookPosition === "center"
    ? { top: "50%", transform: "translateY(-50%)" }
    : { top: "12%" };

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.3s",
        pointerEvents: "none",
        ...positionStyle,
      }}
    >
      <div
        style={{
          background: hookBgColor,
          backdropFilter: "blur(10px)",
          borderRadius: 16,
          padding: "16px 32px",
          maxWidth: "85%",
        }}
      >
        <span
          style={{
            color: hookColor,
            fontSize: hookFontSize,
            fontFamily: "Arial Black, sans-serif",
            fontWeight: 900,
            textAlign: "center",
            textShadow: "2px 2px 8px rgba(0, 0, 0, 0.6)",
            lineHeight: 1.3,
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
};
