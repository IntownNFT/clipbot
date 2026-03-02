import { NextRequest, NextResponse } from "next/server";
import { getEffectiveConfig, saveSettings } from "@/lib/settings-store";

export async function GET() {
  const config = await getEffectiveConfig();
  // Mask API keys for display
  return NextResponse.json({
    ...config,
    claudeApiKey: config.claudeApiKey ? "sk-...configured" : "",
    lateApiKey: config.lateApiKey ? "...configured" : "",
  });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  await saveSettings(body);
  return NextResponse.json({ ok: true });
}
