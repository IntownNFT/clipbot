"use client";

import { motion, AnimatePresence } from "motion/react";
import { ClipEditor } from "@/components/editor/ClipEditor";
import { toMediaUrl } from "@/lib/utils";
import type { AggregatedClip } from "@/app/api/clips/route";

interface ClipEditorModalProps {
  clip: AggregatedClip | null;
  captionMode: "overlay" | "burn-in";
  onClose: () => void;
}

export function ClipEditorSlideOver({ clip, captionMode, onClose }: ClipEditorModalProps) {
  if (!clip) return null;

  // In overlay mode, use raw (uncaptioned) clip so Remotion renders captions live.
  // If rawFilePath is not available, the filePath video likely has burned-in captions
  // already — fall back to burn-in mode to avoid rendering double captions.
  const hasRawSource = !!clip.rawFilePath;
  const effectiveCaptionMode =
    captionMode === "overlay" && !hasRawSource ? "burn-in" : captionMode;

  const sourceFilePath = effectiveCaptionMode === "overlay"
    ? clip.rawFilePath!
    : clip.filePath;
  const videoSrc = toMediaUrl(sourceFilePath);

  return (
    <AnimatePresence>
      {clip && (
        <>
          {/* Backdrop */}
          <motion.div
            key="editor-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50"
          />

          {/* Centered modal */}
          <motion.div
            key="editor-modal"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-5xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <ClipEditor
                runId={clip.runId}
                clipIndex={clip.momentIndex}
                clipTitle={clip.title}
                videoSrc={videoSrc}
                durationSec={clip.durationSeconds}
                words={clip.wordTimestamps}
                hookText={clip.hookText}
                hookDurationSeconds={3}
                captionMode={effectiveCaptionMode}
                onClose={onClose}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
