import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getCreators, updateCreator } from "@/lib/creator-store";
import { addNotification } from "@/lib/notification-store";
import { fetchChannelFeed } from "@/lib/youtube-rss";

export async function POST() {
  const creators = await getCreators();
  const results: Array<{ creatorId: string; newVideos: number }> = [];

  for (const creator of creators) {
    try {
      const videos = await fetchChannelFeed(creator.channelId);
      if (videos.length === 0) continue;

      const latestVideo = videos[0]!;

      // Skip if we've already seen this video
      if (creator.lastVideoId === latestVideo.videoId) {
        await updateCreator(creator.id, {
          lastCheckedAt: new Date().toISOString(),
        });
        results.push({ creatorId: creator.id, newVideos: 0 });
        continue;
      }

      // FIRST CHECK: If we've never checked before, just record the latest video
      // as the baseline. Don't process old videos — only future uploads.
      if (!creator.lastVideoId) {
        await updateCreator(creator.id, {
          lastCheckedAt: new Date().toISOString(),
          lastVideoId: latestVideo.videoId,
        });
        results.push({ creatorId: creator.id, newVideos: 0 });
        continue;
      }

      // Find new videos since last check
      const lastIdx = videos.findIndex((v) => v.videoId === creator.lastVideoId);
      const newVideos = lastIdx === -1
        ? [latestVideo] // Last known video not in feed anymore, just take the newest
        : videos.slice(0, lastIdx); // Everything before the last known video

      if (newVideos.length === 0) {
        await updateCreator(creator.id, {
          lastCheckedAt: new Date().toISOString(),
        });
        results.push({ creatorId: creator.id, newVideos: 0 });
        continue;
      }

      // Update creator's last checked info
      await updateCreator(creator.id, {
        lastCheckedAt: new Date().toISOString(),
        lastVideoId: latestVideo.videoId,
      });

      // Create notifications for each new video
      for (const video of newVideos) {
        await addNotification({
          id: randomUUID().slice(0, 8),
          videoId: video.videoId,
          videoTitle: video.title,
          videoUrl: video.url,
          creatorId: creator.id,
          creatorName: creator.channelName,
          publishedAt: video.publishedAt,
          status: creator.autoProcess ? "processing" : "pending",
          createdAt: new Date().toISOString(),
        });

        // If auto-process is enabled, start the pipeline
        if (creator.autoProcess) {
          try {
            await fetch(new URL("/api/runs", process.env.NEXTAUTH_URL || "http://localhost:3000").href, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                url: video.url,
                ...creator.defaultOptions,
              }),
            });
          } catch {
            // Pipeline start failed, keep notification as pending
          }
        }
      }

      results.push({ creatorId: creator.id, newVideos: newVideos.length });
    } catch {
      results.push({ creatorId: creator.id, newVideos: 0 });
    }
  }

  return NextResponse.json({ results });
}
