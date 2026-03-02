/**
 * YouTube RSS feed parsing and channel ID resolution.
 * Uses free RSS feeds — no API key required.
 */

export interface FeedVideo {
  videoId: string;
  title: string;
  url: string;
  publishedAt: string;
}

/**
 * Fetch the latest videos from a YouTube channel's RSS feed.
 */
export interface ChannelFeedResult {
  channelName: string;
  videos: FeedVideo[];
}

export async function fetchChannelFeed(channelId: string): Promise<FeedVideo[]> {
  const result = await fetchChannelFeedWithMeta(channelId);
  return result.videos;
}

export async function fetchChannelFeedWithMeta(channelId: string): Promise<ChannelFeedResult> {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const res = await fetch(feedUrl);

  if (!res.ok) throw new Error(`Failed to fetch RSS feed: ${res.status}`);

  const xml = await res.text();
  const videos: FeedVideo[] = [];

  // Extract channel name from <author><name> in feed header (before first <entry>)
  const headerXml = xml.split("<entry>")[0] ?? "";
  const channelName = extractTag(headerXml, "name") ?? "";

  // Simple XML parsing — extract <entry> elements
  const entries = xml.split("<entry>").slice(1);
  for (const entry of entries) {
    const videoId = extractTag(entry, "yt:videoId");
    const title = extractTag(entry, "title");
    const published = extractTag(entry, "published");

    if (videoId && title) {
      videos.push({
        videoId,
        title,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        publishedAt: published ?? new Date().toISOString(),
      });
    }
  }

  return { channelName, videos };
}

/**
 * Resolve a YouTube channel URL (handle or custom URL) to a channel ID.
 * Fetches the YouTube page HTML and extracts channelId from meta tags.
 */
export async function extractChannelId(url: string): Promise<{ channelId: string; channelName: string } | null> {
  // If it's already a channel ID URL
  const channelIdMatch = url.match(/channel\/(UC[\w-]+)/);
  if (channelIdMatch) {
    return { channelId: channelIdMatch[1]!, channelName: "" };
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ClipBot/1.0)" },
      redirect: "follow",
    });
    const html = await res.text();

    // Extract channel ID from various meta patterns
    const idMatch = html.match(/(?:"channelId"|"externalId"):"(UC[\w-]+)"/);
    const nameMatch = html.match(/"name":"([^"]+)"/);

    if (idMatch) {
      return {
        channelId: idMatch[1]!,
        channelName: nameMatch?.[1] ?? "",
      };
    }

    // Try canonical link
    const canonicalMatch = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]+)"/);
    if (canonicalMatch) {
      return {
        channelId: canonicalMatch[1]!,
        channelName: nameMatch?.[1] ?? "",
      };
    }
  } catch {
    // Fetch failed
  }

  return null;
}

function extractTag(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}>([^<]+)</${tag}>`));
  return match?.[1] ?? null;
}
