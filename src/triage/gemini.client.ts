import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import type { Env } from '../config/env.validation.js';

const GEMINI_TIMEOUT_MS = 10_000;

export interface CompletionRequest {
  systemInstruction: string;
  userContent: string;
  responseJsonSchema: Record<string, unknown>;
}

@Injectable()
export class GeminiClient {
  private readonly ai: GoogleGenAI | null;
  private readonly model: string;

  constructor(config: ConfigService<Env, true>) {
    const apiKey = config.get('GEMINI_API_KEY', { infer: true });
    this.ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
    this.model = config.get('GEMINI_MODEL', { infer: true });
  }

  /** Returns the raw JSON text from the model. Throws on any failure. */
  async complete(request: CompletionRequest): Promise<string> {
    if (!this.ai) throw new Error('GEMINI_API_KEY is not set');

    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: request.userContent,
      config: {
        systemInstruction: request.systemInstruction,
        responseMimeType: 'application/json',
        responseJsonSchema: request.responseJsonSchema,
        // Temperature is left at the model default, as Google recommends for Gemini 3 models.
        httpOptions: {
          // Timeout applies per attempt. The SDK retries 408, 429, and 5xx
          // responses; 2 attempts = 1 retry after about 1 second.
          timeout: GEMINI_TIMEOUT_MS,
          retryOptions: { attempts: 2, initialDelay: 1 },
        },
      },
    });

    if (!response.text) throw new Error('Gemini returned an empty response');
    return response.text;
  }
}
