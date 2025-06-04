import * as audioService from '@/services/youtube/audioTranscriptionService';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  statSync: jest.fn(() => ({ size: 10 * 1024 * 1024 })), // fake file size < 25MB
  existsSync: jest.fn(() => true),
}));

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
    helpers.fileExists.mockReturnValue(true);
    helpers.unlinkFile.mockResolvedValue(undefined);
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
    helpers.fileExists.mockReturnValue(false);
    await expect(
      audioService.transcribeYouTubeAudio('videoId', { maxDurationMinutes: 30 }, helpers),
    ).rejects.toThrow('yt-dlp fail');
  });

  it('should handle OpenAI API failure', async () => {
    helpers.downloadAudio.mockResolvedValue(undefined);
    helpers.transcribeAudioWithOpenAI.mockRejectedValue(new Error('OpenAI fail'));
    helpers.fileExists.mockReturnValue(true);
    helpers.unlinkFile.mockResolvedValue(undefined);
    await expect(
      audioService.transcribeYouTubeAudio('videoId', { maxDurationMinutes: 30 }, helpers),
    ).rejects.toThrow('OpenAI fail');
  });
});
