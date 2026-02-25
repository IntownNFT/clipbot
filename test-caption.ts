import { generateWordTimingsFromTranscript, renderWithCaptions } from "./src/modules/captions.js";

async function main() {
  const inputVideo = "C:/Users/worra/OneDrive/Desktop/clipbot/clipbot-output/d8730639/clip_2_Massive_Cannabis_Buds_Called_Best_Weed_on_Planet_.mp4";
  const outputVideo = "C:/Users/worra/OneDrive/Desktop/clipbot/clipbot-output/d8730639/clip_2_captioned_test.mp4";

  const text = "People come down and I give them tours and I show them the terp mansion flowers and they say this is the best weed on the planet literally those are the words that come out of their mouth";

  const words = generateWordTimingsFromTranscript(text, 0, 34000);
  console.log("Word timings generated:", words.length, "words");

  console.log("\nRendering with ffmpeg + ASS captions...");
  await renderWithCaptions({
    inputVideoPath: inputVideo,
    outputPath: outputVideo,
    words,
    hookText: "Best weed on the planet?!",
    hookDuration: 3,
    durationInSeconds: 34,
  });

  console.log("Done! Output:", outputVideo);
}

main().catch(console.error);
