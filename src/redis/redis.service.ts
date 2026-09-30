import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import type { Env } from '../config/env.validation.js';

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(config: ConfigService<Env, true>) {
    // The cache is optional: fail commands fast instead of queueing them while
    // Redis is unreachable, so a Redis outage never slows down ticket creation.
    super(config.get('REDIS_URL', { infer: true }), {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      commandTimeout: 500,
    });
    this.on('error', (error: Error) =>
      this.logger.warn(`Redis error: ${error.message}`),
    );
  }

  onModuleDestroy(): void {
    this.disconnect();
  }
}
