import { NextRequest, NextResponse } from "next/server";
import { getNotifications, updateNotification, getPendingCount } from "@/lib/notification-store";

export async function GET(req: NextRequest) {
  const countOnly = req.nextUrl.searchParams.get("count");
  if (countOnly === "true") {
    const count = await getPendingCount();
    return NextResponse.json({ count });
  }
  const notifications = await getNotifications();
  return NextResponse.json(notifications);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, status } = body;
  if (!id || !status) {
    return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
  }
  const updated = await updateNotification(id, { status });
  if (!updated) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}
