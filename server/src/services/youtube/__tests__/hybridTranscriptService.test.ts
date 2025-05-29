jest.mock('../audioTranscriptionService', () => ({
  ...jest.requireActual('../audioTranscriptionService'),
  getVideoDuration: jest.fn(() => 10),
  estimateTranscriptionCost: jest.fn(() => 0.1),
  transcribeYouTubeAudio: jest.fn(),
}));

import { getHybridTranscript } from '../hybridTranscriptService';
import * as captions from '../captionIngestService';
import * as audioService from '../audioTranscriptionService';

describe('getHybridTranscript', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (audioService.getVideoDuration as jest.Mock).mockImplementation(() => 10);
    (audioService.estimateTranscriptionCost as jest.Mock).mockImplementation(() => 0.1);
    (audioService.transcribeYouTubeAudio as jest.Mock).mockReset();
  });

  it('returns captions if available', async () => {
    jest.spyOn(captions, 'fetchYoutubeCaptions').mockResolvedValue('caption text');
    const result = await getHybridTranscript('video1');
    expect(result.method).toBe('captions');
    expect(result.transcript).toBe('caption text');
  });

  it('falls back to audio if captions fail', async () => {
    jest.spyOn(captions, 'fetchYoutubeCaptions').mockRejectedValue(new Error('No captions'));
    (audioService.transcribeYouTubeAudio as jest.Mock).mockResolvedValue('audio text');
    const result = await getHybridTranscript('video2');
    expect(result.method).toBe('audio');
    expect(result.transcript).toBe('audio text');
  });

  it('returns error and debug if both captions and audio fail', async () => {
    jest.spyOn(captions, 'fetchYoutubeCaptions').mockRejectedValue(new Error('yt-dlp missing'));
    (audioService.transcribeYouTubeAudio as jest.Mock).mockRejectedValue(
      new Error('yt-dlp missing'),
    );
    const result = await getHybridTranscript('videoId');
    expect(result.method).toBe('none');
    expect(result.error).toMatch(/yt-dlp missing/);
    expect(result.debug).toEqual(expect.arrayContaining([expect.stringMatching(/yt-dlp missing/)]));
  });

  it('falls back to audio if captions are wrong language', async () => {
    jest.spyOn(captions, 'fetchYoutubeCaptions').mockResolvedValue('');
    (audioService.transcribeYouTubeAudio as jest.Mock).mockResolvedValue('audio transcript');
    const result = await getHybridTranscript('videoId', { language: 'en' });
    expect(result.method).toBe('audio');
    expect(result.transcript).toBe('audio transcript');
  });
});
