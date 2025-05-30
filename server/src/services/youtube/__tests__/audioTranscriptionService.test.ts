import * as audioService from '@/services/youtube/audioTranscriptionService';

describe('transcribeYouTubeAudio', () => {
  let helpers: any;
  beforeEach(() => {
    helpers = {
      downloadAudio: jest.fn(),
      transcribeAudioWithOpenAI: jest.fn(),
      getVideoDuration: jest.fn(() => Promise.resolve(10)),
      fileExists: jest.fn(() => true),
      unlinkFile: jest.fn(() => Promise.resolve()),
      createReadStream: jest.fn(),
      getOpenAI: jest.fn(),
    };
  });

  it('should transcribe audio successfully', async () => {
    helpers.downloadAudio.mockResolvedValue(undefined);
    helpers.transcribeAudioWithOpenAI.mockResolvedValue('transcript');
    const result = await audioService.transcribeYouTubeAudio(
      'videoId',
      { maxDurationMinutes: 30 },
      helpers,
    );
    expect(result).toBe('transcript');
    expect(helpers.downloadAudio).toHaveBeenCalled();
    expect(helpers.transcribeAudioWithOpenAI).toHaveBeenCalled();
    expect(helpers.unlinkFile).toHaveBeenCalled();
  });

  it('should handle yt-dlp failure', async () => {
    helpers.downloadAudio.mockRejectedValue(new Error('yt-dlp fail'));
    await expect(
      audioService.transcribeYouTubeAudio('videoId', { maxDurationMinutes: 30 }, helpers),
    ).rejects.toThrow('yt-dlp fail');
  });

  it('should handle OpenAI API failure', async () => {
    helpers.downloadAudio.mockResolvedValue(undefined);
    helpers.transcribeAudioWithOpenAI.mockRejectedValue(new Error('OpenAI fail'));
    await expect(
      audioService.transcribeYouTubeAudio('videoId', { maxDurationMinutes: 30 }, helpers),
    ).rejects.toThrow('OpenAI fail');
  });
});
