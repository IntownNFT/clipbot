import { NextRequest, NextResponse } from "next/server";
import { getRun, getManifest } from "@/lib/run-store";

const WORKER_URL = process.env.WORKER_URL;
const WORKER_AUTH = process.env.WORKER_AUTH_TOKEN;
const isServerless = !!process.env.VERCEL;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  // Proxy to worker
  if (isServerless && WORKER_URL) {
    try {
      const headers: Record<string, string> = {};
      if (WORKER_AUTH) headers["Authorization"] = `Bearer ${WORKER_AUTH}`;
      const res = await fetch(`${WORKER_URL}/jobs/${runId}`, { headers });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } catch {
      return NextResponse.json({ error: "Worker unreachable" }, { status: 502 });
    }
  }

  if (isServerless) {
    return NextResponse.json({ error: "No worker configured" }, { status: 501 });
  }

  const run = await getRun(runId);
  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const manifest = await getManifest(run.outputDir);
  return NextResponse.json({ ...run, manifest });
}
