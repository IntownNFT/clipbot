"use client";

import { motion } from "motion/react";
import { UserMessage } from "./UserMessage";
import { BotResponse } from "./BotResponse";
import type { ChatMessage } from "@/hooks/useChatMessages";

interface ChatThreadProps {
  message: ChatMessage;
  onRetry: () => void;
}

export function ChatThread({ message, onRetry }: ChatThreadProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-3"
    >
      {/* User message (right-aligned) */}
      <UserMessage
        sourceUrl={message.sourceUrl}
        startedAt={message.startedAt}
      />

      {/* Bot response (left-aligned) */}
      <BotResponse
        runId={message.runId}
        sourceUrl={message.sourceUrl}
        status={message.status}
        manifest={message.manifest}
        downloadProgress={message.downloadProgress}
        options={message.options as Record<string, unknown>}
        onRetry={onRetry}
      />
    </motion.div>
  );
}
