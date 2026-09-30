export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';

export interface Env {
  DATABASE_URL: string;
  REDIS_URL: string;
  GEMINI_API_KEY: string | undefined;
  GEMINI_MODEL: string;
  PORT: number;
}

const REQUIRED_KEYS = ['DATABASE_URL', 'REDIS_URL'] as const;

export function validateEnv(raw: Record<string, unknown>): Env {
  const read = (key: string): string | undefined => {
    const value = raw[key];
    return typeof value === 'string' && value.trim() !== ''
      ? value.trim()
      : undefined;
  };

  const missing = REQUIRED_KEYS.filter((key) => !read(key));
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  const port = Number(read('PORT') ?? 3000);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('PORT must be a positive integer');
  }

  return {
    DATABASE_URL: read('DATABASE_URL') as string,
    REDIS_URL: read('REDIS_URL') as string,
    GEMINI_API_KEY: read('GEMINI_API_KEY'),
    GEMINI_MODEL: read('GEMINI_MODEL') ?? DEFAULT_GEMINI_MODEL,
    PORT: port,
  };
}
