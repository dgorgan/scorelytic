import pLimit from 'p-limit';
import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api/youtube/process';

//YouTube video IDs to process
const videoIds = [
  '6kothCE21ks',
  'dQw4w9WgXcQ',
  'yoFvVAMcwOE',
  'kMzqGUyoG1U',
  'voX0IY71_jw',
  '6kothCE21ks',
  'F6dZxoob8CY',
  'MHrsygIxC5k',
  'VpevTNRK-_M',
  'sHO9OW0_ocg',
  'JliVeSsajO0',
  'Vf3Kpi_OZqE',
];

const limit = pLimit(5); // Only 5 concurrent requests

async function runBatch() {
  const promises = videoIds.map((videoId) =>
    limit(() =>
      fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, demoMode: true }),
      })
        .then((res) => res.json())
        .then((data) => {
          console.log('Result for videoId', videoId, data.success ? 'OK' : data.error || data);
        })
        .catch((err) => {
          console.error('Error processing', videoId, err);
        }),
    ),
  );
  await Promise.all(promises);
  console.log('Batch complete.');
}

runBatch();
