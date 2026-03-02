"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { ChatThread } from "./ChatThread";
import { Clapperboard } from "lucide-react";
import type { ChatMessage } from "@/hooks/useChatMessages";

interface ChatFeedProps {
  messages: ChatMessage[];
  loading: boolean;
  onRetry: () => void;
}

export function ChatFeed({ messages, loading, onRetry }: ChatFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages or status changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, messages[messages.length - 1]?.status]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="space-y-3 w-full max-w-md px-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl shimmer" />
          ))}
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center justify-center text-center px-4"
        >
          <Clapperboard className="h-14 w-14 text-muted mb-4 float" />
          <h2 className="text-xl font-semibold mb-2">No clips yet</h2>
          <p className="text-muted text-sm max-w-sm">
            Paste a YouTube URL below to create your first viral clips
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-2xl mx-auto space-y-8">
        {messages.map((msg) => (
          <ChatThread key={msg.runId} message={msg} onRetry={onRetry} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
