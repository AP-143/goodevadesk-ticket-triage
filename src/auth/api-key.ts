import { createHash } from 'node:crypto';

// API keys are random, high-entropy strings, so a fast unsalted hash is enough
// and keeps the lookup a single indexed query.
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}
