export * from './Review';

export interface DemoReview {
  id: string;
  video_url: string;
  metadata?: {
    title?: string;
    channelTitle?: string;
    channelId?: string;
    publishedAt?: string;
    thumbnails?: {
      maxres?: { url: string };
      high?: { url: string };
      default?: { url: string };
    };
    tags?: string[];
    description?: string;
  };
  slug?: string;
  data: {
    sentiment?: {
      score?: number;
      verdict?: string;
      sentimentScore?: number;
      biasAdjustment?: {
        biasAdjustedScore?: number;
      };
      summary?: string;
      pros?: string[];
      cons?: string[];
      biasIndicators?: string[];
      alsoRecommends?: string[];
      biasDetection?: {
        biasesDetected?: Array<{
          name: string;
          severity: string;
          impactOnExperience: string;
          scoreInfluence: string;
          explanation: string;
        }>;
      };
      culturalContext?: {
        justification?: string;
        ideologicalThemes?: string[];
        audienceReactions?: {
          aligned?: string;
          neutral?: string;
          opposed?: string;
        };
      };
    };
    debug?: string[];
  };
}
