export interface SentimentAnalysisResponse {
  sentiment: {
    score: number;
    verdict: string;
    pros: string[];
    cons: string[];
  };
}

export interface ReviewAnalysisRequest {
  reviewId: string;
}

export interface ReviewAnalysisResponse {
  reviewId: string;
  sentiment: any;
  metadata: {
    gameTitle: string;
    creatorName: string;
    publishedAt: string;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SentimentAnalysisRequest {
  text: string;
}

export interface BiasReportRequest {
  sentimentScore: number;
  biasIndicators: string[];
}

export interface BiasReportResponse {
  // Add fields as needed by biasReportController
  [key: string]: any;
}
