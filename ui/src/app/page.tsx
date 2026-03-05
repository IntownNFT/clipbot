"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link, Layers, Users, Play } from "lucide-react";
import { ChatFeed } from "@/components/chat/ChatFeed";
import { PromptInput } from "@/components/chat/PromptInput";
import { useThreads } from "@/hooks/useThreads";
import { useThread } from "@/contexts/ThreadContext";
import { useSpace } from "@/contexts/SpaceContext";
import { useAiChat } from "@/hooks/useAiChat";
import { normalizeUrl } from "@/lib/utils";

const TAGLINES = [
  "Drop a link, make it viral.",
  "Find the best moments automatically.",
  "From long-form to short-form in seconds.",
  "AI-powered clip extraction.",
];

const SUGGESTION_CHIPS = [
  { label: "Paste a YouTube URL", icon: "link" },
  { label: "List my spaces", icon: "layers" },
  { label: "Check my creators", icon: "users" },
  { label: "Show recent runs", icon: "play" },
] as const;

const CHIP_ICONS = {
  link: Link,
  layers: Layers,
  users: Users,
  play: Play,
} as const;

export default function ChatPage() {
  const { threads, loading, addRun, refetch } = useThreads();
  const { activeThreadId, setActiveThread, chatThreadId } = useThread();
  const { activeSpaceId } = useSpace();
  const { sendMessage, aiMessages, isThinking } = useAiChat(chatThreadId);

  const [taglineIndex, setTaglineIndex] = useState(0);

  // Cycle taglines every 3.5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineIndex((prev) => (prev + 1) % TAGLINES.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const threadMessages = useMemo(() => {
    if (!activeThreadId) return [];
    const thread = threads.find((t) => t.threadId === activeThreadId);
    if (!thread) return [];
    return [...thread.runs].reverse();
  }, [activeThreadId, threads]);

  const handleSubmit = useCallback(
    (runId: string, sourceUrl: string) => {
      addRun({
        runId,
        sourceUrl,
        status: "downloading",
        startedAt: new Date().toISOString(),
      });
      setActiveThread(normalizeUrl(sourceUrl));
    },
    [addRun, setActiveThread]
  );

  const handleChat = useCallback(
    (message: string) => {
      sendMessage(message, activeSpaceId);
    },
    [sendMessage, activeSpaceId]
  );

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleChipClick = useCallback(
    (label: string) => {
      handleChat(label);
    },
    [handleChat]
  );

  const hasAiActivity = aiMessages.length > 0 || isThinking;
  const showHero = !activeThreadId && !loading && !hasAiActivity;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <AnimatePresence mode="wait">
        {showHero ? (
          <motion.div
            key="hero"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex-1 flex flex-col items-center justify-center px-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="text-center mb-8"
            >
              <h1 className="text-4xl font-light tracking-tight text-foreground/80 mb-3">
                ClipBot
              </h1>
              <div className="h-14 relative overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={taglineIndex}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="text-lg text-muted/70 absolute inset-x-0 line-clamp-2"
                  >
                    {TAGLINES[taglineIndex]}
                  </motion.p>
                </AnimatePresence>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.15,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="w-full max-w-2xl"
            >
              <PromptInput onSubmit={handleSubmit} onChat={handleChat} />
            </motion.div>

            {/* Quick action suggestion chips */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.3,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="flex flex-wrap items-center justify-center gap-2 mt-4 max-w-2xl"
            >
              {SUGGESTION_CHIPS.map((chip) => {
                const Icon = CHIP_ICONS[chip.icon];
                return (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => handleChipClick(chip.label)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/60 bg-surface-1/50 text-xs text-muted/80 hover:text-foreground/90 hover:border-accent/30 hover:bg-surface-1 transition-all duration-200 cursor-pointer"
                  >
                    <Icon className="h-3 w-3" />
                    {chip.label}
                  </button>
                );
              })}
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex flex-col flex-1 min-h-0"
          >
            <ChatFeed
              messages={threadMessages}
              aiMessages={aiMessages}
              isAiThinking={isThinking}
              loading={loading}
              onRetry={handleRetry}
            />
            <PromptInput
              onSubmit={handleSubmit}
              onChat={handleChat}
              disabled={isThinking}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
