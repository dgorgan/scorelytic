export interface ReviewMetadata {
  gameTitle: string;
  channelTitle: string;
  publishedAt: string;
  description?: string;
}

export async function getReviewMetadata(reviewId: string): Promise<ReviewMetadata> {
  // TODO: Implement actual YouTube API integration
  // For now, return mock data
  return {
    gameTitle: 'Sample Game',
    channelTitle: 'Game Reviewer',
    publishedAt: new Date().toISOString(),
    description: 'This is a great game with excellent mechanics and engaging story.'
  };
} 