import { NextRequest, NextResponse } from "next/server";

const WORKER_URL = process.env.WORKER_URL;
const WORKER_AUTH = process.env.WORKER_AUTH_TOKEN;

function workerHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  if (WORKER_AUTH) h["Authorization"] = `Bearer ${WORKER_AUTH}`;
  return h;
}

// GET /api/cookies — check cookie status on worker
export async function GET() {
  if (!WORKER_URL) {
    return NextResponse.json({ error: "No worker configured" }, { status: 501 });
  }
  try {
    const res = await fetch(`${WORKER_URL}/cookies/status`, { headers: workerHeaders() });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Worker unreachable" }, { status: 502 });
  }
}

// PUT /api/cookies — upload cookies.txt content to worker
export async function PUT(req: NextRequest) {
  if (!WORKER_URL) {
    return NextResponse.json({ error: "No worker configured" }, { status: 501 });
  }
  const body = await req.text();
  if (!body.trim()) {
    return NextResponse.json({ error: "Empty body" }, { status: 400 });
  }
  try {
    const res = await fetch(`${WORKER_URL}/cookies`, {
      method: "PUT",
      headers: { ...workerHeaders(), "Content-Type": "text/plain" },
      body,
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Worker unreachable" }, { status: 502 });
  }
}
