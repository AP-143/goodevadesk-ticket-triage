import { normalizeTicketText, triageCacheKey } from './cache-key.js';

describe('normalizeTicketText', () => {
  it('lowercases, strips punctuation, and collapses whitespace', () => {
    expect(normalizeTicketText('  Refund, please!! ', 'I was\n\ncharged   TWICE.')).toBe(
      'refund please i was charged twice',
    );
  });

  it('keeps non-Latin letters and digits', () => {
    expect(normalizeTicketText('Привет!', 'Tagihan #123 ganda')).toBe(
      'привет tagihan 123 ganda',
    );
  });
});

describe('triageCacheKey', () => {
  it('uses the versioned, organization-scoped format', () => {
    expect(triageCacheKey('org-1', 'a', 'b')).toMatch(/^llm:v1:org-1:[0-9a-f]{64}$/);
  });

  it('matches texts that differ only in case, punctuation, or spacing', () => {
    expect(triageCacheKey('org-1', 'Refund please!', 'I was charged   twice.')).toBe(
      triageCacheKey('org-1', 'refund please', 'i was charged twice'),
    );
  });

  it('differs when the words differ', () => {
    expect(triageCacheKey('org-1', 'Refund please', 'charged twice')).not.toBe(
      triageCacheKey('org-1', 'Refund please', 'charged once'),
    );
  });

  it('differs per organization', () => {
    expect(triageCacheKey('org-1', 'a', 'b')).not.toBe(triageCacheKey('org-2', 'a', 'b'));
  });
});
