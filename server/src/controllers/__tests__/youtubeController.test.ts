import request from 'supertest';
import express from 'express';
import { youtubeController } from '../youtubeController';

jest.mock('../../services/youtube/captionIngestService', () => ({
  normalizeYoutubeToReview: jest.fn(async (args) => ({
    ...args,
    transcript: 'mock transcript',
    videoUrl: 'https://www.youtube.com/watch?v=mock',
    title: 'Mock Title',
    publishedAt: '2023-01-01',
    thumbnails: [],
    tags: [],
    _youtubeMeta: { channelTitle: 'Mock Channel', channelId: 'mockid' },
  })),
  upsertReviewToSupabase: jest.fn(),
  upsertDemoReview: jest.fn(async () => {}),
}));
jest.mock('../../services/youtube/youtubeApiService', () => ({
  fetchYouTubeVideoMetadata: jest.fn(async () => ({
    title: 'Mock Title',
    channelTitle: 'Mock Channel',
    channelId: 'mockid',
    publishedAt: '2023-01-01',
    description: 'desc',
    thumbnails: [],
    tags: [],
  })),
  extractGameFromMetadata: jest.fn(() => 'Mock Game'),
  createSlug: jest.fn((x) => x.toLowerCase().replace(/ /g, '-')),
}));
jest.mock('../../services/youtube/hybridTranscriptService', () => ({
  getHybridTranscript: jest.fn(async () => ({
    transcript: 'mock transcript',
    method: 'caption',
    cost: 0.1,
    error: null,
    debug: [],
  })),
}));
jest.mock('../../services/sentiment', () => ({
  analyzeTextWithBiasAdjustmentFull: jest.fn(async () => ({
    sentimentScore: 8,
    biasDetection: {},
    biasAdjustment: {},
    sentimentSnapshot: {},
    culturalContext: {},
  })),
  analyzeGeneralSummary: jest.fn(async () => ({
    summary: 'summary',
    keyNotes: ['note1', 'note2'],
  })),
}));
jest.mock('../../config/database', () => ({
  supabase: { from: jest.fn(() => ({ upsert: jest.fn() })) },
}));

const app = express();
app.use(express.json());
app.post('/process', youtubeController.processVideo);
app.get('/stream', youtubeController.processVideoStream);
app.get('/meta/:videoId', youtubeController.youtubeMetadataHandler);
app.get('/general-analysis', youtubeController.generalAnalysisHandler);

describe('youtubeController', () => {
  it('returns 400 if videoId is missing', async () => {
    const res = await request(app).post('/process').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('handles demoMode with generalAnalysis', async () => {
    const res = await request(app)
      .post('/process')
      .send({ videoId: 'mock', demoMode: true, generalAnalysis: true });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary).toBe('summary');
    expect(res.body.data.keyNotes).toContain('note1');
  });

  it('handles demoMode with bias/sentiment analysis', async () => {
    const res = await request(app).post('/process').send({ videoId: 'mock', demoMode: true });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sentiment).toBeDefined();
  });

  it('handles normal mode with generalAnalysis', async () => {
    const res = await request(app)
      .post('/process')
      .send({ videoId: 'mock', generalAnalysis: true });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary).toBe('summary');
    expect(res.body.data.keyNotes).toContain('note1');
  });

  it('handles normal mode with bias/sentiment analysis', async () => {
    const res = await request(app).post('/process').send({ videoId: 'mock' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sentiment).toBeDefined();
  });

  it('handles processVideo error', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const orig = require('../../services/youtube/captionIngestService').normalizeYoutubeToReview;
    require('../../services/youtube/captionIngestService').normalizeYoutubeToReview.mockImplementationOnce(
      () => {
        throw new Error('fail');
      },
    );
    const res = await request(app).post('/process').send({ videoId: 'mock' });
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    require('../../services/youtube/captionIngestService').normalizeYoutubeToReview.mockImplementation(
      orig,
    );
  });

  it('streams events for processVideoStream', async () => {
    // Ensure all mocks return success for this test
    require('../../services/youtube/captionIngestService').normalizeYoutubeToReview.mockResolvedValue(
      {
        transcript: 'mock transcript',
        videoUrl: 'https://www.youtube.com/watch?v=mock',
        title: 'Mock Title',
        publishedAt: '2023-01-01',
        thumbnails: [],
        tags: [],
        _youtubeMeta: { channelTitle: 'Mock Channel', channelId: 'mockid' },
      },
    );
    require('../../services/youtube/hybridTranscriptService').getHybridTranscript.mockResolvedValue(
      {
        transcript: 'mock transcript',
        method: 'caption',
        cost: 0.1,
        error: null,
        debug: [],
      },
    );
    require('../../services/sentiment').analyzeTextWithBiasAdjustmentFull.mockResolvedValue({
      sentimentScore: 8,
      biasDetection: {},
      biasAdjustment: {},
      sentimentSnapshot: {},
      culturalContext: {},
    });
    require('../../services/sentiment').analyzeGeneralSummary.mockResolvedValue({
      summary: 'summary',
      keyNotes: ['note1', 'note2'],
    });
    const res = await request(app)
      .get('/stream')
      .query({ videoId: 'mock' })
      .buffer(true)
      .parse((res, cb) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk.toString();
        });
        res.on('end', () => {
          res.text = data;
          cb(null, data);
        });
      });
    expect(res.status).toBe(200);
    expect(res.text).toContain('event: result');
    expect(res.text).toContain('success');
  });

  it('returns error event if videoId missing in stream', async () => {
    const res = await request(app)
      .get('/stream')
      .buffer(true)
      .parse((res, cb) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk.toString();
        });
        res.on('end', () => {
          res.text = data;
          cb(null, data);
        });
      });
    expect(res.text).toContain('event: error');
    expect(res.text).toContain('videoId is required');
  });

  it('handles youtubeMetadataHandler happy path', async () => {
    const res = await request(app).get('/meta/mock');
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Mock Title');
  });

  it('handles youtubeMetadataHandler missing videoId', async () => {
    const res = await request(app).get('/meta/');
    // Express will 404, not 400, for missing param
    expect(res.status).toBe(404);
  });
});
