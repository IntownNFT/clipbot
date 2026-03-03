"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export interface AiToolCallEvent {
  name: string;
  input: Record<string, unknown>;
  result?: unknown;
  error?: string;
  status: "running" | "done" | "error";
}

export interface AiChatMessage {
  id: string;
  type: "user" | "assistant" | "tool-call";
  content?: string;
  toolCall?: AiToolCallEvent;
  timestamp: string;
}

interface StoredMessage {
  id: string;
  threadId: string;
  role: "user" | "assistant" | "tool";
  content: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    input: Record<string, unknown>;
  }>;
  toolResults?: Array<{
    toolCallId: string;
    name: string;
    result: unknown;
  }>;
  timestamp: string;
}

/** Convert persisted messages into client-side AiChatMessage format */
function hydrateMessages(stored: StoredMessage[]): AiChatMessage[] {
  const messages: AiChatMessage[] = [];

  for (const msg of stored) {
    if (msg.role === "user") {
      messages.push({
        id: msg.id,
        type: "user",
        content: msg.content,
        timestamp: msg.timestamp,
      });
    } else if (msg.role === "assistant") {
      // If this message has tool calls, render them first
      if (msg.toolCalls && msg.toolResults) {
        for (const tc of msg.toolCalls) {
          const result = msg.toolResults.find((r) => r.toolCallId === tc.id);
          messages.push({
            id: `${msg.id}-tool-${tc.id}`,
            type: "tool-call",
            toolCall: {
              name: tc.name,
              input: tc.input,
              result: result?.result,
              status: "done",
            },
            timestamp: msg.timestamp,
          });
        }
      }

      // Render text content (skip pure tool-call placeholder messages)
      const textContent = msg.content.replace(/\[Tool call: \w+\]\n?/g, "").trim();
      if (textContent) {
        messages.push({
          id: msg.id,
          type: "assistant",
          content: textContent,
          timestamp: msg.timestamp,
        });
      }
    }
  }

  return messages;
}

export function useAiChat(threadId: string | null) {
  const [aiMessages, setAiMessages] = useState<AiChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [activeToolCall, setActiveToolCall] = useState<AiToolCallEvent | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Clear messages and load persisted history when threadId changes
  useEffect(() => {
    setAiMessages([]);
    setHistoryLoaded(false);

    if (!threadId) return;

    let cancelled = false;
    fetch(`/api/chat?threadId=${encodeURIComponent(threadId)}`)
      .then((res) => res.json())
      .then((stored: StoredMessage[]) => {
        if (cancelled || !stored.length) return;
        setAiMessages(hydrateMessages(stored));
      })
      .catch(() => {
        // Ignore fetch errors on load
      })
      .finally(() => {
        if (!cancelled) setHistoryLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [threadId]);

  const sendMessage = useCallback(
    async (message: string, spaceId?: string | null) => {
      if (!threadId) return;

      // Add user message to local state
      const userMsg: AiChatMessage = {
        id: crypto.randomUUID(),
        type: "user",
        content: message,
        timestamp: new Date().toISOString(),
      };
      setAiMessages((prev) => [...prev, userMsg]);
      setIsThinking(true);
      setActiveToolCall(null);

      // Abort any existing connection
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ threadId, message, spaceId }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const err = await res.text();
          setAiMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              type: "assistant",
              content: `Error: ${err}`,
              timestamp: new Date().toISOString(),
            },
          ]);
          setIsThinking(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          let eventType = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith("data: ") && eventType) {
              try {
                const data = JSON.parse(line.slice(6));
                handleSSEEvent(eventType, data);
              } catch {
                // Skip malformed JSON
              }
              eventType = "";
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setAiMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              type: "assistant",
              content: `Connection error: ${(err as Error).message}`,
              timestamp: new Date().toISOString(),
            },
          ]);
        }
      } finally {
        setIsThinking(false);
        setActiveToolCall(null);
      }
    },
    [threadId]
  );

  function handleSSEEvent(event: string, data: Record<string, unknown>) {
    switch (event) {
      case "ai-thinking":
        setIsThinking(true);
        break;

      case "ai-tool-call": {
        const toolCall = data as unknown as AiToolCallEvent;
        setActiveToolCall(toolCall);
        if (toolCall.status === "done" || toolCall.status === "error") {
          setAiMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              type: "tool-call",
              toolCall,
              timestamp: new Date().toISOString(),
            },
          ]);
        }
        break;
      }

      case "ai-message": {
        const content = data.content as string;
        if (content?.trim()) {
          setAiMessages((prev) => {
            // If the last message is also an assistant message, replace it
            // (Claude may send intermediate text before tool calls, then final text)
            const last = prev[prev.length - 1];
            if (last?.type === "assistant" && !last.toolCall) {
              return [
                ...prev.slice(0, -1),
                {
                  id: last.id,
                  type: "assistant" as const,
                  content,
                  timestamp: last.timestamp,
                },
              ];
            }
            return [
              ...prev,
              {
                id: crypto.randomUUID(),
                type: "assistant",
                content,
                timestamp: new Date().toISOString(),
              },
            ];
          });
        }
        break;
      }

      case "ai-done":
        setIsThinking(false);
        setActiveToolCall(null);
        break;

      case "ai-error":
        setIsThinking(false);
        setActiveToolCall(null);
        setAiMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            type: "assistant",
            content: `Error: ${data.message}`,
            timestamp: new Date().toISOString(),
          },
        ]);
        break;
    }
  }

  const clearMessages = useCallback(() => {
    setAiMessages([]);
  }, []);

  return { sendMessage, aiMessages, isThinking, activeToolCall, clearMessages, historyLoaded };
}
