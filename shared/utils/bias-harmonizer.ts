const biasLabels = [
  'nostalgia bias',
  'influencer bias',
  'sponsored bias',
  'contrarian',
  'genre aversion',
  'reviewer fatigue',
  'technical criticism',
  'platform bias',
  'accessibility bias',
  'story-driven bias',
  'franchise bias'
];

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

export function harmonizeBias(arr: string[]): string[] {
  return arr.map(s => {
    let norm = s.toLowerCase().replace(/s$/, '').trim();
    // Exact or partial match
    for (const label of biasLabels) {
      if (norm === label) return label;
      if (label.includes(norm) || norm.includes(label)) return label;
    }
    // Fuzzy match (Levenshtein)
    let best = biasLabels[0], minDist = levenshtein(norm, biasLabels[0]);
    for (const label of biasLabels) {
      const dist = levenshtein(norm, label);
      if (dist < minDist) { best = label; minDist = dist; }
    }
    return minDist <= 3 ? best : norm;
  });
} 