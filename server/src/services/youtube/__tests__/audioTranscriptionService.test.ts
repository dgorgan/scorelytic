import * as audioService from '../audioTranscriptionService';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  statSync: jest.fn(() => ({ size: 10 * 1024 * 1024 })), // fake file size < 25MB
  existsSync: jest.fn(() => true),
  createReadStream: jest.fn(() => ({})),
}));

jest.mock('fluent-ffmpeg', () => {
  const actual = jest.requireActual('fluent-ffmpeg');
  return Object.assign(() => ({}), actual, {
    ffprobe: jest.fn((_, cb) => cb(null, { format: { duration: 60 } })),
  });
});

// Patch: export splitAudioFile from audioTranscriptionService and mock it here
(audioService as any).splitAudioFile = jest.fn(async () => [
  '/tmp/videoId_audio.chunk0.mp3',
  '/tmp/videoId_audio.chunk1.mp3',
]);

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

  it('should handle chunking for large files', async () => {
    jest.spyOn(require('fs'), 'statSync').mockReturnValue({ size: 30 * 1024 * 1024 });
    jest.spyOn(require('child_process'), 'execSync').mockImplementation(() => undefined);
    (audioService as any).splitAudioFile = jest.fn(async () => [
      '/tmp/videoId_audio.chunk0.mp3',
      '/tmp/videoId_audio.chunk1.mp3',
    ]);
    helpers.transcribeAudioWithOpenAI.mockResolvedValue('chunked-transcript');
    helpers.fileExists.mockReturnValue(true);
    helpers.unlinkFile.mockResolvedValue(undefined);
    const result = await audioService.transcribeYouTubeAudio(
      'videoId',
      { maxDurationMinutes: 30 },
      helpers,
    );
    expect(result).toBe('chunked-transcriptchunked-transcript');
  });

  it('should throw if video is too long', async () => {
    helpers.downloadAudio.mockRejectedValue(new Error('file not created'));
    helpers.fileExists.mockReturnValue(false);
    helpers.getVideoDuration.mockResolvedValue(40);
    await expect(
      audioService.transcribeYouTubeAudio('videoId', { maxDurationMinutes: 30 }, helpers),
    ).rejects.toThrow(/too long/);
  });

  it('should throw if video is unavailable', async () => {
    helpers.downloadAudio.mockRejectedValue(new Error('Video unavailable'));
    helpers.fileExists.mockReturnValue(false);
    helpers.getVideoDuration.mockResolvedValue(10);
    await expect(
      audioService.transcribeYouTubeAudio('videoId', { maxDurationMinutes: 30 }, helpers),
    ).rejects.toThrow(/unavailable/);
  });

  it('should throw if video is private', async () => {
    helpers.downloadAudio.mockRejectedValue(new Error('Private video'));
    helpers.fileExists.mockReturnValue(false);
    helpers.getVideoDuration.mockResolvedValue(10);
    await expect(
      audioService.transcribeYouTubeAudio('videoId', { maxDurationMinutes: 30 }, helpers),
    ).rejects.toThrow(/private/i);
  });

  it('should throw generic error for other failures', async () => {
    helpers.downloadAudio.mockRejectedValue(new Error('other error'));
    helpers.fileExists.mockReturnValue(false);
    helpers.getVideoDuration.mockResolvedValue(10);
    await expect(
      audioService.transcribeYouTubeAudio('videoId', { maxDurationMinutes: 30 }, helpers),
    ).rejects.toThrow(/Audio transcription failed/);
  });

  it('should pass forceEnglish option to transcribeAudioWithOpenAI', async () => {
    helpers.downloadAudio.mockResolvedValue(undefined);
    helpers.transcribeAudioWithOpenAI.mockResolvedValue('transcript');
    helpers.fileExists.mockReturnValue(true);
    helpers.unlinkFile.mockResolvedValue(undefined);
    jest.spyOn(require('fs'), 'statSync').mockReturnValue({ size: 10 * 1024 * 1024 });
    const result = await audioService.transcribeYouTubeAudio(
      'videoId',
      { maxDurationMinutes: 30, forceEnglish: true },
      helpers,
    );
    expect(helpers.transcribeAudioWithOpenAI).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      true,
    );
    expect(result).toBe('transcript');
  });
});

describe('estimateTranscriptionCost', () => {
  it('estimates cost correctly', () => {
    expect(audioService.estimateTranscriptionCost(10)).toBeCloseTo(0.06);
    expect(audioService.estimateTranscriptionCost(0)).toBe(0);
  });
});
