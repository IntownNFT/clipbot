import { readFile } from "node:fs/promises";
import type { ViralMoment } from "../types/clip.js";
import type {
  ClipResult,
  PublishOptions,
  PostResult,
} from "../types/pipeline.js";
import { log } from "../utils/logger.js";
import { retry } from "../utils/retry.js";

interface LateMediaResponse {
  uploadUrl: string;
  publicUrl: string;
}

interface LatePostResponse {
  id: string;
  status: string;
  posts?: Array<{
    platform: string;
    status: string;
    postUrl?: string;
    error?: string;
  }>;
}

async function lateRequest<T>(
  endpoint: string,
  apiKey: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `https://getlate.dev/api/v1${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Late API ${res.status}: ${body}`);
  }

  let body;
  try {
    body = await res.json();
  } catch {
    throw new Error(`Late.dev returned invalid JSON (HTTP ${res.status})`);
  }
  return body as T;
}

async function uploadMedia(
  filePath: string,
  apiKey: string
): Promise<string> {
  const filename = filePath.split(/[\\/]/).pop() ?? "clip.mp4";

  // 1. Get presigned upload URL
  const presign = await lateRequest<LateMediaResponse>(
    "/media/presign",
    apiKey,
    {
      method: "POST",
      body: JSON.stringify({ filename, contentType: "video/mp4" }),
    }
  );

  // 2. Upload file to presigned URL
  const fileBuffer = await readFile(filePath);
  const uploadRes = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "video/mp4" },
    body: fileBuffer,
  });

  if (!uploadRes.ok) {
    throw new Error(`Upload failed: ${uploadRes.status}`);
  }

  log.debug(`Uploaded ${filename} → ${presign.publicUrl}`);
  return presign.publicUrl;
}

function buildPostContent(moment: ViralMoment, platform: string): string {
  const hashtags = moment.hashtags.map((h) => `#${h}`).join(" ");
  const shortsSuffix = platform === "youtube" ? " #shorts" : "";
  return `${moment.title}\n\n${moment.hookText}\n\n${hashtags}${shortsSuffix}`;
}

export async function uploadAndPost(
  clip: ClipResult,
  moment: ViralMoment,
  apiKey: string,
  options: PublishOptions
): Promise<PostResult> {
  // 1. Upload media
  const mediaUrl = await retry(() => uploadMedia(clip.filePath, apiKey));

  // 2. Create post across platforms
  const platforms = options.platforms.map((p) => ({
    platform: p.platform,
    accountId: p.accountId,
  }));

  const content = buildPostContent(moment, platforms[0]?.platform ?? "tiktok");

  const postBody = {
    content,
    mediaItems: [{ type: "video", url: mediaUrl }],
    platforms,
    ...(options.publishNow
      ? { publishNow: true }
      : { scheduledFor: options.scheduledFor }),
  };

  const response = await retry(() =>
    lateRequest<LatePostResponse>("/posts", apiKey, {
      method: "POST",
      body: JSON.stringify(postBody),
    })
  );

  const platformResults =
    response.posts?.map((p) => ({
      platform: p.platform,
      status: (p.status === "published" || p.status === "scheduled"
        ? p.status
        : "failed") as "published" | "scheduled" | "failed",
      url: p.postUrl,
      error: p.error,
    })) ??
    platforms.map((p) => ({
      platform: p.platform,
      status: "published" as const,
    }));

  return {
    clipIndex: moment.index,
    postId: response.id,
    platforms: platformResults,
  };
}

export async function listAccounts(
  apiKey: string
): Promise<Array<{ id: string; platform: string; name: string }>> {
  const res = await lateRequest<{
    accounts: Array<{ _id: string; platform: string; displayName?: string; name?: string; username?: string }>;
  }>("/accounts", apiKey, { method: "GET" });

  return (res.accounts ?? []).map((a) => ({
    id: a._id,
    platform: a.platform,
    name: a.displayName ?? a.name ?? a.username ?? a._id,
  }));
}
