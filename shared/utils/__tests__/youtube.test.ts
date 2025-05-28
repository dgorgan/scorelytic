import { extractVideoId, isValidVideoId, createYouTubeUrl, createThumbnailUrl } from '@/shared/utils/youtube';

describe('extractVideoId', () => {
  it('returns null for empty or invalid input', () => {
    expect(extractVideoId('')).toBeNull();
    expect(extractVideoId(' ')).toBeNull();
    expect(extractVideoId('not-a-youtube-link')).toBeNull();
    expect(extractVideoId('123')).toBeNull();
  });
  it('returns ID for direct video ID', () => {
    expect(extractVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('extracts ID from standard YouTube URL', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractVideoId('youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('extracts ID from shorts URL', () => {
    expect(extractVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
});

describe('isValidVideoId', () => {
  it('validates correct YouTube video IDs', () => {
    expect(isValidVideoId('dQw4w9WgXcQ')).toBe(true);
    expect(isValidVideoId('a1b2c3d4e5F')).toBe(true);
  });
  it('rejects invalid IDs', () => {
    expect(isValidVideoId('')).toBe(false);
    expect(isValidVideoId('short')).toBe(false);
    expect(isValidVideoId('toolongvideoid123')).toBe(false);
    expect(isValidVideoId('invalid!@#')).toBe(false);
  });
});

describe('createYouTubeUrl', () => {
  it('creates a valid YouTube watch URL', () => {
    expect(createYouTubeUrl('dQw4w9WgXcQ')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });
});

describe('createThumbnailUrl', () => {
  it('creates correct thumbnail URLs for all qualities', () => {
    expect(createThumbnailUrl('dQw4w9WgXcQ', 'default')).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg');
    expect(createThumbnailUrl('dQw4w9WgXcQ', 'medium')).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg');
    expect(createThumbnailUrl('dQw4w9WgXcQ', 'high')).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
    expect(createThumbnailUrl('dQw4w9WgXcQ', 'maxres')).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg');
  });
  it('defaults to medium quality', () => {
    expect(createThumbnailUrl('dQw4w9WgXcQ')).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg');
  });
}); 