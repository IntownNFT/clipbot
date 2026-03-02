import { NextRequest, NextResponse } from "next/server";
import { updateNotification, getNotifications } from "@/lib/notification-store";
import { getCreators } from "@/lib/creator-store";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const notifications = await getNotifications();
  const notification = notifications.find((n) => n.id === id);

  if (!notification) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }

  // Get creator's default options
  const creators = await getCreators();
  const creator = creators.find((c) => c.id === notification.creatorId);

  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const res = await fetch(new URL("/api/runs", baseUrl).href, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: notification.videoUrl,
        ...creator?.defaultOptions,
      }),
    });
    const data = await res.json();

    await updateNotification(id, { status: "processing", runId: data.runId });
    return NextResponse.json({ runId: data.runId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
