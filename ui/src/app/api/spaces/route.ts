import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getSpaces, createSpace } from "@/lib/space-store";

export async function GET() {
  let spaces = await getSpaces();

  // Auto-create a default space if none exist
  if (spaces.length === 0) {
    const defaultSpace = {
      id: randomUUID().slice(0, 8),
      name: "Default",
      description: "",
      icon: "",
      settings: {},
      accounts: [],
      creators: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await createSpace(defaultSpace);
    spaces = [defaultSpace];
  }

  return NextResponse.json(spaces);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, description, icon, niche } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const space = {
    id: randomUUID().slice(0, 8),
    name,
    description: description ?? "",
    icon: icon ?? "📁",
    settings: {
      ...(niche && { niche }),
    },
    accounts: [],
    creators: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await createSpace(space);
  return NextResponse.json(space, { status: 201 });
}
