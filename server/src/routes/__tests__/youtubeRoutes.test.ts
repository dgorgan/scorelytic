import request from 'supertest';
import app from '../../app';
import * as hybridService from '../../services/youtube/hybridTranscriptService';
const { upsertReviewToSupabase } = require('../../config/database');

jest.mock('../../config/database', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => ({ data: null }),
          maybeSingle: () => ({ data: null })
        })
      }),
      insert: () => ({
        select: () => ({
          single: () => ({ data: { id: 1 } }),
          maybeSingle: () => ({ data: { id: 1 } })
        })
      }),
      upsert: () => ({
        select: () => ({
          single: () => ({ data: { id: 1 } }),
          maybeSingle: () => ({ data: { id: 1 } })
        })
      })
    })
  },
  upsertReviewToSupabase: jest.fn()
}));

jest.mock('../../services/youtube/youtubeApiService', () => ({
  fetchYouTubeVideoMetadata: jest.fn(() => ({
    title: 'Test Title',
    channelTitle: 'Test Channel',
    channelId: 'test-channel-id',
    publishedAt: '2020-01-01T00:00:00Z',
    description: 'desc',
    thumbnails: {},
    tags: []
  })),
  extractGameFromMetadata: jest.fn(() => 'Test Game'),
  createSlug: jest.fn((str) => str.toLowerCase().replace(/\s+/g, '-'))
}));

jest.mock('../../services/sentiment', () => ({
  analyzeTextWithBiasAdjustmentFull: jest.fn(() => ({
    summary: 'Test summary',
    sentimentScore: 5,
    verdict: 'positive',
    sentimentSummary: 'Positive',
    biasIndicators: [],
    alsoRecommends: [],
    pros: ['Good audio'],
    cons: [],
    reviewSummary: 'Good review',
    biasDetection: {},
    biasAdjustment: {},
    sentimentSnapshot: {},
    culturalContext: {}
  }))
}));

describe('POST /api/youtube/process', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fallback to audio if captions are missing', async () => {
    jest.spyOn(hybridService, 'getHybridTranscript').mockResolvedValue({
      transcript: 'audio transcript',
      method: 'audio',
      cost: 0.2,
      debug: ['[HYBRID] Attempting captions', '[HYBRID] ❌ Captions failed', '[HYBRID] Attempting audio transcription', '[HYBRID] ✅ Audio transcription successful']
    });
    const res = await request(app)
      .post('/api/youtube/process')
      .send({ videoId: 'audio-fallback-test' });
    expect(res.status).toBe(200);
    expect(res.body.transcript.method).toBe('audio');
    expect(res.body.transcript.debug).toEqual(expect.arrayContaining(['[HYBRID] Attempting audio transcription', '[HYBRID] ✅ Audio transcription successful']));
  }, 15000);

  it('should not cache if transcript is empty or sentiment is default', async () => {
    jest.spyOn(hybridService, 'getHybridTranscript').mockResolvedValue({
      transcript: '',
      method: 'none',
      debug: ['[HYBRID] Attempting captions', '[HYBRID] ❌ Captions failed', '[HYBRID] Audio fallback disabled']
    });
    const upsertSpy = upsertReviewToSupabase as jest.Mock;
    const res = await request(app)
      .post('/api/youtube/process')
      .send({ videoId: 'empty-transcript-test' });
    expect(res.status).toBe(200);
    expect(upsertSpy).not.toHaveBeenCalled();
    expect(res.body.transcript.method).toBe('none');
  });

  it('should propagate debug and error info in transcript', async () => {
    jest.spyOn(hybridService, 'getHybridTranscript').mockResolvedValue({
      transcript: '',
      method: 'none',
      error: 'Both captions and audio transcription failed',
      debug: ['[HYBRID] Attempting captions', '[HYBRID] ❌ Captions failed', '[HYBRID] ❌ Audio transcription failed']
    });
    const res = await request(app)
      .post('/api/youtube/process')
      .send({ videoId: 'debug-error-test' });
    expect(res.status).toBe(200);
    expect(res.body.transcript.error).toMatch(/Both captions and audio transcription failed/);
    expect(res.body.transcript.debug).toContain('[HYBRID] ❌ Audio transcription failed');
  });
}); 