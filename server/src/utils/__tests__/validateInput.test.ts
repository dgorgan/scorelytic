import { validateInput } from '../validateInput';

describe('validateInput', () => {
  it('returns true for valid text', () => {
    expect(validateInput({ text: 'hello' })).toBe(true);
  });

  it('returns false for empty text', () => {
    expect(validateInput({ text: '' })).toBe(false);
    expect(validateInput({ text: '   ' })).toBe(false);
    expect(validateInput({ text: null })).toBe(false);
    expect(validateInput({ text: undefined })).toBe(false);
  });

  it('returns true for valid sentimentScore', () => {
    expect(validateInput({ sentimentScore: 0 })).toBe(true);
    expect(validateInput({ sentimentScore: 1 })).toBe(true);
    expect(validateInput({ sentimentScore: -1 })).toBe(true);
  });

  it('returns false for invalid sentimentScore', () => {
    expect(validateInput({ sentimentScore: 2 })).toBe(false);
    expect(validateInput({ sentimentScore: -2 })).toBe(false);
    expect(validateInput({ sentimentScore: 'a' })).toBe(false);
    expect(validateInput({ sentimentScore: null })).toBe(false);
    expect(validateInput({ sentimentScore: undefined })).toBe(false);
  });

  it('returns true for valid biasIndicators', () => {
    expect(validateInput({ biasIndicators: ['a', 'b'] })).toBe(true);
  });

  it('returns false for invalid biasIndicators', () => {
    expect(validateInput({ biasIndicators: [] })).toBe(false);
    expect(validateInput({ biasIndicators: [1, 2] })).toBe(false);
    expect(validateInput({ biasIndicators: null })).toBe(false);
    expect(validateInput({ biasIndicators: undefined })).toBe(false);
  });

  it('returns true for valid reviewId', () => {
    expect(validateInput({ reviewId: 'abc-123_X' })).toBe(true);
  });

  it('returns false for invalid reviewId', () => {
    expect(validateInput({ reviewId: '' })).toBe(false);
    expect(validateInput({ reviewId: 'abc 123' })).toBe(false);
    expect(validateInput({ reviewId: null })).toBe(false);
    expect(validateInput({ reviewId: undefined })).toBe(false);
    expect(validateInput({ reviewId: 'abc$123' })).toBe(false);
  });

  it('returns true for multiple valid fields', () => {
    expect(validateInput({ text: 'hi', sentimentScore: 0.5, biasIndicators: ['b'], reviewId: 'id1' })).toBe(true);
  });

  it('returns false if any field is invalid', () => {
    expect(validateInput({ text: 'hi', sentimentScore: 2 })).toBe(false);
    expect(validateInput({ text: '', reviewId: 'id1' })).toBe(false);
    expect(validateInput({ biasIndicators: [], reviewId: 'id1' })).toBe(false);
  });
}); 