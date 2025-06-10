import pLimit from 'p-limit';
import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api/youtube/process';

//YouTube video IDs to process
const videoIds = [
  // 'bgecA94pBFs',
  'sHO9OW0_ocg',
  // '6lrihmd9Exo',
  // '6kothCE21ks',
  // 'dQw4w9WgXcQ',
  // 'yoFvVAMcwOE',
  // 'kMzqGUyoG1U',
  // 'voX0IY71_jw',
  // '6kothCE21ks',
  // 'F6dZxoob8CY',
  // 'MHrsygIxC5k',
  // 'VpevTNRK-_M',
  // 'JliVeSsajO0',
  // 'Vf3Kpi_OZqE',
];

const limit = pLimit(5); // Only 5 concurrent requests

async function runBatch() {
  const promises = videoIds.map((videoId) =>
    limit(async () => {
      // Fetch the payload, remove _youtube_meta if present
      const payload = { videoId, demoMode: true };
      // If you ever add more fields, strip _youtube_meta here
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      console.log('Result for videoId', videoId, data);
    }),
  );
  await Promise.all(promises);
  console.log('Batch complete.');
}

runBatch();
