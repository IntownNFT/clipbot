import React from "react";
import { Composition, registerRoot } from "remotion";
import { ClipComposition } from "./ClipComposition";

const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ClipWithCaptions"
        component={ClipComposition as any}
        durationInFrames={30 * 60}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          videoSrc: "",
          words: [],
          hookText: "",
          hookDurationSeconds: 3,
        }}
      />
    </>
  );
};

registerRoot(RemotionRoot);
