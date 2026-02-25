import { Innertube } from "youtubei.js";

async function main() {
  const yt = await Innertube.create();
  const info = await yt.getInfo("aircAruvnKk");

  console.log("Title:", info.basic_info.title);
  console.log("Duration:", info.basic_info.duration, "seconds");

  // Check available methods for transcript
  const captions = info.captions;
  console.log("\nCaptions available:", !!captions);

  if (captions) {
    const tracks = captions.caption_tracks;
    console.log("Tracks:", tracks?.length);
    if (tracks && tracks.length > 0) {
      console.log("Languages:", tracks.map((t: any) => `${t.language_code} (${t.name?.text ?? t.name})`).join(", "));

      // Find English track
      const enTrack = tracks.find((t: any) => t.language_code === "en");
      if (enTrack) {
        console.log("\nFetching English captions...");
        console.log("Base URL:", enTrack.base_url?.slice(0, 100));

        // Fetch the transcript via the info object's methods
        const transcript = await info.getTranscript();
        console.log("Transcript type:", typeof transcript);
        console.log("Transcript keys:", Object.keys(transcript ?? {}));

        const content = (transcript as any)?.transcript?.content;
        if (content) {
          const body = content.body;
          const segments = body?.initial_segments ?? [];
          console.log("Segments:", segments.length);
          if (segments.length > 0) {
            const parsed = segments.slice(0, 5).map((seg: any) => ({
              text: seg.snippet?.text ?? "",
              startMs: seg.start_ms ?? seg.startMs,
              endMs: seg.end_ms ?? seg.endMs,
            }));
            console.log("Sample:", JSON.stringify(parsed, null, 2));
          }
        } else {
          console.log("Full transcript response:", JSON.stringify(transcript, null, 2).slice(0, 2000));
        }
      }
    }
  }
}

main().catch(console.error);
