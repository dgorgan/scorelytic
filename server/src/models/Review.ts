export type Review = {
  id?: string;
  gameId: string;
  creatorId: string;
  videoUrl: string;
  score: number;
  pros: string[];
  cons: string[];
  sentimentSummary: string;
  biasIndicators: string[];
  alsoRecommends: string[];
  createdAt: string; // ISO date
  transcript?: string;
};
