import { DEFAULT_GEMINI_MODEL, validateEnv } from './env.validation.js';

describe('validateEnv', () => {
  const required = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    REDIS_URL: 'redis://localhost:6379',
  };

  it('applies defaults for optional variables', () => {
    expect(validateEnv(required)).toEqual({
      ...required,
      GEMINI_API_KEY: undefined,
      GEMINI_MODEL: DEFAULT_GEMINI_MODEL,
      PORT: 3000,
    });
  });

  it('throws when required variables are missing', () => {
    expect(() => validateEnv({})).toThrow(
      'Missing required environment variables: DATABASE_URL, REDIS_URL',
    );
  });

  it('treats blank optional values as unset', () => {
    const env = validateEnv({
      ...required,
      GEMINI_API_KEY: '  ',
      GEMINI_MODEL: '',
    });
    expect(env.GEMINI_API_KEY).toBeUndefined();
    expect(env.GEMINI_MODEL).toBe(DEFAULT_GEMINI_MODEL);
  });

  it('parses PORT and rejects invalid values', () => {
    expect(validateEnv({ ...required, PORT: '8080' }).PORT).toBe(8080);
    expect(() => validateEnv({ ...required, PORT: 'abc' })).toThrow(
      'PORT must be a positive integer',
    );
  });
});
