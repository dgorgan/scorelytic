import fetch from 'node-fetch';

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

const API_URL = 'http://localhost:5000/api/youtube/process';
const DELAY_MS = 15000;

async function runBatch() {
  for (const videoId of videoIds) {
    console.log('Processing', videoId);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, demoMode: true }),
      });
      const data = await res.json();
      console.log('Result:', data.success ? 'OK' : data.error || data);
    } catch (err) {
      console.error('Error processing', videoId, err);
    }
    if (videoId !== videoIds[videoIds.length - 1]) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }
  console.log('Batch complete.');
}

runBatch();
