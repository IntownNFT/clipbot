import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { CHAT_FILE } from "./paths";

export interface ChatStoreMessage {
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

type ChatData = Record<string, ChatStoreMessage[]>;

async function readChatData(): Promise<ChatData> {
  try {
    const raw = await readFile(CHAT_FILE, "utf-8");
    return JSON.parse(raw) as ChatData;
  } catch {
    return {};
  }
}

async function writeChatData(data: ChatData): Promise<void> {
  await mkdir(path.dirname(CHAT_FILE), { recursive: true });
  await writeFile(CHAT_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export async function getChatMessages(threadId: string): Promise<ChatStoreMessage[]> {
  const data = await readChatData();
  return data[threadId] ?? [];
}

export async function saveChatMessage(threadId: string, msg: ChatStoreMessage): Promise<void> {
  const data = await readChatData();
  if (!data[threadId]) data[threadId] = [];
  data[threadId].push(msg);
  await writeChatData(data);
}

/** Get messages formatted for Claude API conversation history */
export async function getChatHistory(threadId: string): Promise<
  Array<{ role: "user" | "assistant"; content: string }>
> {
  const messages = await getChatMessages(threadId);
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
}
