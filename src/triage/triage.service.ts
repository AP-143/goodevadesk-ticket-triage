import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service.js';
import { triageCacheKey } from './cache-key.js';
import { GeminiClient } from './gemini.client.js';
import {
  buildTriageUserContent,
  parseTriageResponse,
  serializeTriageResult,
  TRIAGE_RESPONSE_SCHEMA,
  TRIAGE_SYSTEM_INSTRUCTION,
  type TriageResult,
} from './triage.prompt.js';

export const TRIAGE_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;

@Injectable()
export class TriageService {
  private readonly logger = new Logger(TriageService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly gemini: GeminiClient,
  ) {}

  /** Classifies a ticket and drafts a reply. Returns null on any failure; never throws. */
  async triage(
    organizationId: string,
    subject: string,
    message: string,
  ): Promise<TriageResult | null> {
    const key = triageCacheKey(organizationId, subject, message);

    const cached = await this.readCache(key);
    if (cached) {
      this.logger.debug(`Cache hit for ${key}`);
      return cached;
    }

    let raw: string;
    try {
      raw = await this.gemini.complete({
        systemInstruction: TRIAGE_SYSTEM_INSTRUCTION,
        userContent: buildTriageUserContent(subject, message),
        responseJsonSchema: TRIAGE_RESPONSE_SCHEMA,
      });
    } catch (error) {
      this.logger.warn(`Gemini call failed: ${errorMessage(error)}`);
      return null;
    }

    const result = parseTriageResponse(raw);
    if (!result) {
      this.logger.warn('Gemini returned an invalid triage response');
      return null;
    }

    await this.writeCache(key, result);
    return result;
  }

  private async readCache(key: string): Promise<TriageResult | null> {
    try {
      return parseTriageResponse((await this.redis.get(key)) ?? undefined);
    } catch (error) {
      this.logger.warn(`Cache read failed: ${errorMessage(error)}`);
      return null;
    }
  }

  private async writeCache(key: string, result: TriageResult): Promise<void> {
    try {
      await this.redis.set(
        key,
        serializeTriageResult(result),
        'EX',
        TRIAGE_CACHE_TTL_SECONDS,
      );
    } catch (error) {
      this.logger.warn(`Cache write failed: ${errorMessage(error)}`);
    }
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
