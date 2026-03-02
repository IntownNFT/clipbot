import { NextRequest, NextResponse } from "next/server";
import { getSpace, updateSpace, removeSpace, getSpaceEffectiveSettings } from "@/lib/space-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const space = await getSpace(id);
  if (!space) {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }

  const effectiveSettings = await getSpaceEffectiveSettings(id);

  return NextResponse.json({ ...space, effectiveSettings });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const updated = await updateSpace(id, body);
  if (!updated) {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const removed = await removeSpace(id);
  if (!removed) {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
