import { Module } from '@nestjs/common';
import { GeminiClient } from './gemini.client.js';
import { TriageService } from './triage.service.js';

@Module({
  providers: [TriageService, GeminiClient],
  exports: [TriageService],
})
export class TriageModule {}
