import { NextRequest, NextResponse } from "next/server";
import { getRun, getManifest } from "@/lib/run-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const run = await getRun(runId);
  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const manifest = await getManifest(run.outputDir);

  return NextResponse.json({
    ...run,
    manifest,
  });
}
