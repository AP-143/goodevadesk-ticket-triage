import { createHash } from 'node:crypto';

// Bump the version whenever the prompt or response schema changes, so results
// produced by an older prompt are not reused.
const CACHE_KEY_PREFIX = 'llm:v1';

export function normalizeTicketText(subject: string, message: string): string {
  return `${subject}\n${message}`
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function triageCacheKey(
  organizationId: string,
  subject: string,
  message: string,
): string {
  const hash = createHash('sha256')
    .update(normalizeTicketText(subject, message))
    .digest('hex');
  return `${CACHE_KEY_PREFIX}:${organizationId}:${hash}`;
}
