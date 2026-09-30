import type { RedisService } from '../redis/redis.service.js';
import { triageCacheKey } from './cache-key.js';
import type { GeminiClient } from './gemini.client.js';
import { TRIAGE_CACHE_TTL_SECONDS, TriageService } from './triage.service.js';

const VALID_JSON = JSON.stringify({
  category: 'technical',
  suggested_reply: 'Please try resetting your password.',
});
const VALID_RESULT = {
  category: 'technical',
  suggestedReply: 'Please try resetting your password.',
};
const KEY = triageCacheKey('org-1', 'Login', 'Cannot sign in');

function setup() {
  const redis = {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
  };
  const gemini = { complete: vi.fn().mockResolvedValue(VALID_JSON) };
  const service = new TriageService(
    redis as unknown as RedisService,
    gemini as unknown as GeminiClient,
  );
  return { redis, gemini, service };
}

describe('TriageService', () => {
  it('returns a cached result without calling Gemini', async () => {
    const { redis, gemini, service } = setup();
    redis.get.mockResolvedValue(VALID_JSON);

    await expect(
      service.triage('org-1', 'Login', 'Cannot sign in'),
    ).resolves.toEqual(VALID_RESULT);
    expect(redis.get).toHaveBeenCalledWith(KEY);
    expect(gemini.complete).not.toHaveBeenCalled();
  });

  it('calls Gemini on a cache miss and caches the valid result', async () => {
    const { redis, gemini, service } = setup();

    await expect(
      service.triage('org-1', 'Login', 'Cannot sign in'),
    ).resolves.toEqual(VALID_RESULT);
    expect(gemini.complete).toHaveBeenCalledTimes(1);
    expect(redis.set).toHaveBeenCalledWith(
      KEY,
      VALID_JSON,
      'EX',
      TRIAGE_CACHE_TTL_SECONDS,
    );
  });

  it('returns null and does not cache an invalid response', async () => {
    const { redis, gemini, service } = setup();
    gemini.complete.mockResolvedValue(
      '{"category":"sales","suggested_reply":"Hi"}',
    );

    await expect(
      service.triage('org-1', 'Login', 'Cannot sign in'),
    ).resolves.toBeNull();
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('returns null when Gemini fails (timeout, rate limit, network)', async () => {
    const { redis, gemini, service } = setup();
    gemini.complete.mockRejectedValue(new Error('Request timed out'));

    await expect(
      service.triage('org-1', 'Login', 'Cannot sign in'),
    ).resolves.toBeNull();
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('falls back to Gemini when the Redis read fails', async () => {
    const { redis, gemini, service } = setup();
    redis.get.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(
      service.triage('org-1', 'Login', 'Cannot sign in'),
    ).resolves.toEqual(VALID_RESULT);
    expect(gemini.complete).toHaveBeenCalledTimes(1);
  });

  it('still returns the result when the Redis write fails', async () => {
    const { redis, service } = setup();
    redis.set.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(
      service.triage('org-1', 'Login', 'Cannot sign in'),
    ).resolves.toEqual(VALID_RESULT);
  });
});
