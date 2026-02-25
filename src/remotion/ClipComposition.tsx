import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  Sequence,
  useVideoConfig,
} from "remotion";
import { CaptionOverlay, type WordTiming } from "./CaptionOverlay";
import { HookText } from "./HookText";

export interface ClipCompositionProps {
  videoSrc: string;
  words: WordTiming[];
  hookText?: string;
  hookDurationSeconds?: number;
}

export const ClipComposition: React.FC<ClipCompositionProps> = ({
  videoSrc,
  words,
  hookText,
  hookDurationSeconds = 3,
}) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <OffthreadVideo src={videoSrc} />

      {/* Hook text in first few seconds */}
      {hookText && (
        <Sequence from={0} durationInFrames={Math.round(hookDurationSeconds * fps)}>
          <HookText text={hookText} durationSeconds={hookDurationSeconds} />
        </Sequence>
      )}

      {/* Word-by-word captions */}
      <CaptionOverlay words={words} />
    </AbsoluteFill>
  );
};
