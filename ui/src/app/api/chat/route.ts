import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { createSSEStream, sseResponse } from "@/lib/sse";
import { getChatMessages, saveChatMessage, type ChatStoreMessage } from "@/lib/chat-store";
import { TOOLS, executeTool } from "@/lib/ai/tools";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { getEffectiveConfig } from "@/lib/settings-store";
import { getSpace } from "@/lib/space-store";

const MAX_TOOL_ROUNDS = 10;

/** GET /api/chat?threadId=xxx — load persisted chat history */
export async function GET(req: NextRequest) {
  const threadId = req.nextUrl.searchParams.get("threadId");
  if (!threadId) {
    return Response.json({ error: "threadId is required" }, { status: 400 });
  }
  const messages = await getChatMessages(threadId);
  return Response.json(messages);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { threadId, message, spaceId } = body as {
    threadId: string;
    message: string;
    spaceId?: string;
  };

  if (!threadId || !message) {
    return Response.json({ error: "threadId and message are required" }, { status: 400 });
  }

  const stream = createSSEStream(async (send) => {
    try {
      // Load config and initialize client
      const config = await getEffectiveConfig();
      const apiKey = config.claudeApiKey;
      if (!apiKey) {
        send("ai-error", { message: "No Anthropic API key configured. Add it in Settings." });
        return;
      }

      const client = new Anthropic({ apiKey });
      const model = config.claudeModel || "claude-sonnet-4-20250514";

      // Build system prompt with space context
      let spaceName: string | null = null;
      if (spaceId) {
        const space = await getSpace(spaceId);
        spaceName = space?.name ?? null;
      }
      const systemPrompt = buildSystemPrompt({ activeSpaceId: spaceId, spaceName });

      // Load conversation history
      const history = await getChatMessages(threadId);
      const apiMessages: Anthropic.MessageParam[] = history
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      // Add the new user message
      apiMessages.push({ role: "user", content: message });

      // Save user message to store
      await saveChatMessage(threadId, {
        id: crypto.randomUUID(),
        threadId,
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
      });

      send("ai-thinking", {});

      // Agentic loop
      let currentMessages = apiMessages;
      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const response = await client.messages.create({
          model,
          max_tokens: 4096,
          system: systemPrompt,
          tools: TOOLS,
          messages: currentMessages,
        });

        // Check for tool use
        const toolUseBlocks = response.content.filter(
          (block): block is Anthropic.ContentBlock & { type: "tool_use" } =>
            block.type === "tool_use"
        );
        const textBlocks = response.content.filter(
          (block): block is Anthropic.TextBlock => block.type === "text"
        );

        // If there are text blocks, stream them
        if (textBlocks.length > 0) {
          const text = textBlocks.map((b) => b.text).join("\n");
          if (text.trim()) {
            send("ai-message", { content: text });
          }
        }

        // If no tool calls, we're done
        if (toolUseBlocks.length === 0) {
          const finalText = textBlocks.map((b) => b.text).join("\n");

          // Save assistant message
          await saveChatMessage(threadId, {
            id: crypto.randomUUID(),
            threadId,
            role: "assistant",
            content: finalText,
            timestamp: new Date().toISOString(),
          });

          send("ai-done", {});
          return;
        }

        // Execute tool calls
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        const toolCallsForStore: ChatStoreMessage["toolCalls"] = [];
        const toolResultsForStore: ChatStoreMessage["toolResults"] = [];

        for (const toolBlock of toolUseBlocks) {
          send("ai-tool-call", {
            name: toolBlock.name,
            input: toolBlock.input,
            status: "running",
          });

          try {
            const result = await executeTool(
              toolBlock.name,
              toolBlock.input as Record<string, unknown>
            );
            const resultStr = JSON.stringify(result);

            send("ai-tool-call", {
              name: toolBlock.name,
              input: toolBlock.input,
              result,
              status: "done",
            });

            toolResults.push({
              type: "tool_result",
              tool_use_id: toolBlock.id,
              content: resultStr,
            });

            toolCallsForStore.push({
              id: toolBlock.id,
              name: toolBlock.name,
              input: toolBlock.input as Record<string, unknown>,
            });

            toolResultsForStore.push({
              toolCallId: toolBlock.id,
              name: toolBlock.name,
              result,
            });
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            send("ai-tool-call", {
              name: toolBlock.name,
              input: toolBlock.input,
              error: errorMsg,
              status: "error",
            });

            toolResults.push({
              type: "tool_result",
              tool_use_id: toolBlock.id,
              content: `Error: ${errorMsg}`,
              is_error: true,
            });
          }
        }

        // Save tool interaction to store
        const assistantContent = response.content.map((block) => {
          if (block.type === "text") return block.text;
          if (block.type === "tool_use") return `[Tool call: ${block.name}]`;
          return "";
        }).join("\n");

        await saveChatMessage(threadId, {
          id: crypto.randomUUID(),
          threadId,
          role: "assistant",
          content: assistantContent,
          toolCalls: toolCallsForStore,
          toolResults: toolResultsForStore,
          timestamp: new Date().toISOString(),
        });

        // Continue the loop with tool results
        currentMessages = [
          ...currentMessages,
          { role: "assistant" as const, content: response.content },
          { role: "user" as const, content: toolResults },
        ];
      }

      // If we exit the loop, send what we have
      send("ai-message", {
        content: "I've reached the maximum number of tool calls for this request. Please try a simpler question.",
      });
      send("ai-done", {});
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      send("ai-error", { message: errorMsg });
    }
  });

  return sseResponse(stream);
}
