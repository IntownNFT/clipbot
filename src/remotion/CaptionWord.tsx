import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

interface CaptionWordProps {
  text: string;
  startFrame: number;
  active: boolean;
}

export const CaptionWord: React.FC<CaptionWordProps> = ({
  text,
  startFrame,
  active,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const animationDuration = Math.round(fps * 0.15); // 150ms pop animation
  const progress = interpolate(
    frame,
    [startFrame, startFrame + animationDuration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const scale = active
    ? interpolate(progress, [0, 0.6, 1], [0.8, 1.15, 1])
    : 1;

  return (
    <span
      style={{
        display: "inline-block",
        color: active ? "#FFD700" : "rgba(255, 255, 255, 0.6)",
        transform: `scale(${scale})`,
        textShadow: active
          ? "0 0 20px rgba(255, 215, 0, 0.5), 2px 2px 4px rgba(0, 0, 0, 0.8)"
          : "2px 2px 4px rgba(0, 0, 0, 0.8)",
        transition: "color 0.1s",
        marginRight: "0.3em",
        fontWeight: 900,
      }}
    >
      {text}
    </span>
  );
};
