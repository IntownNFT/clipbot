import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getScheduledPosts, addScheduledPost } from "@/lib/schedule-store";
import { getEffectiveConfig } from "@/lib/settings-store";

export async function GET() {
  const posts = await getScheduledPosts();
  return NextResponse.json(posts);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { runId, clipIndex, clipTitle, platforms, scheduledFor } = body;

  if (!runId || clipIndex === undefined || !scheduledFor) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const config = await getEffectiveConfig();
  if (!config.lateApiKey) {
    return NextResponse.json({ error: "Late API key not configured" }, { status: 400 });
  }

  const post = {
    id: randomUUID().slice(0, 8),
    runId,
    clipIndex,
    clipTitle: clipTitle ?? `Clip #${clipIndex}`,
    platforms: platforms ?? ["tiktok", "youtube", "instagram"],
    scheduledFor,
    status: "scheduled" as const,
    createdAt: new Date().toISOString(),
  };

  await addScheduledPost(post);
  return NextResponse.json(post, { status: 201 });
}
