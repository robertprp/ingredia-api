import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { AdditiveResearchPort } from '../../application/ports/additive-research.port';
import {
  AdditiveResearchCandidate,
  AdditiveResearchResult,
} from '../../domain/additive.types';

const researchPayloadSchema = z.object({
  description: z.string().min(1).nullable(),
  foodUses: z.string().min(1).nullable(),
  healthImpact: z.string().min(1).nullable(),
  lowDoseEffects: z.string().min(1).nullable(),
  highDoseEffects: z.string().min(1).nullable(),
  toxicityLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH']).nullable(),
  pregnancySuitability: z.enum(['SUITABLE', 'NOT_SUITABLE', 'UNKNOWN']),
  pregnancyRationale: z.string().min(1),
  evidenceQuality: z.enum(['INSUFFICIENT', 'LIMITED', 'GOOD']),
  citations: z.array(
    z.object({
      title: z.string().min(1),
      url: z.url(),
      publisher: z.string().min(1),
    }),
  ),
});

const ppqResponseSchema = z.object({
  id: z.string().min(1),
  model: z.string().min(1),
  status: z.string(),
  output_text: z.string().min(1).optional(),
  output: z
    .array(
      z
        .object({
          type: z.string().optional(),
          status: z.string().optional(),
          content: z
            .array(
              z
                .object({
                  type: z.string().optional(),
                  text: z.string().optional(),
                })
                .passthrough(),
            )
            .optional(),
        })
        .passthrough(),
    )
    .optional(),
});

@Injectable()
export class PpqAdditiveResearchAdapter implements AdditiveResearchPort {
  private readonly logger = new Logger(PpqAdditiveResearchAdapter.name);
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(@Inject(ConfigService) config: ConfigService) {
    this.apiKey = config.get<string>('PPQ_API_KEY');
    this.baseUrl = (
      config.get<string>('PPQ_BASE_URL') ?? 'https://api.ppq.ai'
    ).replace(/\/$/, '');
    this.model = config.get<string>('PPQ_MODEL') ?? 'perplexity/sonar-pro';
    this.timeoutMs = this.parseTimeout(config.get<string>('PPQ_TIMEOUT_MS'));
  }

  async research(
    candidate: AdditiveResearchCandidate,
  ): Promise<AdditiveResearchResult> {
    if (!this.apiKey) {
      throw new Error('PPQ_API_KEY is required to research additive data.');
    }
    const response = await this.requestWithRetry(candidate);
    const parsedResponseResult = ppqResponseSchema.safeParse(response);
    if (!parsedResponseResult.success) {
      this.logger.warn(
        this.event('ppq_response_invalid', {
          eNumber: candidate.eNumber,
          response: this.summarizeResponse(response),
          validation: this.summarizeZodError(parsedResponseResult.error),
        }),
      );
      throw new Error(
        `PPQ response envelope is invalid: ${this.summarizeZodError(parsedResponseResult.error)}`,
      );
    }
    const parsedResponse = parsedResponseResult.data;
    if (parsedResponse.status !== 'completed') {
      throw new Error(
        `PPQ response did not complete (status: ${parsedResponse.status}).`,
      );
    }
    const outputText = this.extractOutputText(parsedResponse);
    const payloadResult = researchPayloadSchema.safeParse(
      this.parseStructuredOutput(outputText),
    );
    if (!payloadResult.success) {
      this.logger.warn(
        this.event('ppq_output_invalid', {
          eNumber: candidate.eNumber,
          responseId: parsedResponse.id,
          model: parsedResponse.model,
          outputCharacters: outputText.length,
          validation: this.summarizeZodError(payloadResult.error),
        }),
      );
      throw new Error(
        `PPQ structured output is invalid: ${this.summarizeZodError(payloadResult.error)}`,
      );
    }
    const payload = payloadResult.data;
    const hasEvidence = payload.citations.length > 0;
    const supportedPregnancyConclusion =
      payload.evidenceQuality !== 'INSUFFICIENT' && hasEvidence;
    const result: AdditiveResearchResult = {
      ...payload,
      pregnancySuitability: supportedPregnancyConclusion
        ? payload.pregnancySuitability
        : 'UNKNOWN',
      pregnancyRationale: supportedPregnancyConclusion
        ? payload.pregnancyRationale
        : 'No se encontró evidencia explícita y suficiente sobre el embarazo; requiere revisión clínica editorial.',
      model: parsedResponse.model,
      externalResponseId: parsedResponse.id,
      researchedAt: new Date(),
    };
    this.logger.log(
      this.event('ppq_research_completed', {
        eNumber: candidate.eNumber,
        responseId: result.externalResponseId,
        model: result.model,
        evidenceQuality: result.evidenceQuality,
        citations: result.citations.length,
        pregnancySuitability: result.pregnancySuitability,
      }),
    );
    return result;
  }

  private async requestWithRetry(
    candidate: AdditiveResearchCandidate,
  ): Promise<unknown> {
    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        this.logger.log(
          this.event('ppq_request_started', {
            eNumber: candidate.eNumber,
            model: this.model,
            attempt,
            timeoutMs: this.timeoutMs,
          }),
        );
        return await this.request(candidate);
      } catch (error: unknown) {
        lastError =
          error instanceof Error ? error : new Error('Unknown PPQ error');
        const retrying = attempt < 3 && this.isTransient(lastError);
        const retryDelayMs = retrying ? attempt * 750 : 0;
        this.logger.warn(
          this.event('ppq_request_failed', {
            eNumber: candidate.eNumber,
            attempt,
            retrying,
            retryDelayMs,
            error: lastError.message,
          }),
        );
        if (!retrying) throw lastError;
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
    throw lastError ?? new Error('PPQ research failed.');
  }

  private async request(
    candidate: AdditiveResearchCandidate,
  ): Promise<unknown> {
    const startedAt = Date.now();
    const response = await fetch(`${this.baseUrl}/v1/responses`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        instructions: this.instructions(),
        input: JSON.stringify(candidate),
        tools: [{ type: 'web_search' }],
        tool_choice: 'required',
        max_output_tokens: 2_000,
        response_format: this.responseFormat(),
        store: false,
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    const requestId =
      response.headers.get('x-request-id') ??
      response.headers.get('x-ppq-request-id') ??
      response.headers.get('cf-ray');
    this.logger.log(
      this.event('ppq_http_response', {
        eNumber: candidate.eNumber,
        httpStatus: response.status,
        durationMs: Date.now() - startedAt,
        requestId,
      }),
    );
    if (!response.ok) {
      throw new PpqHttpError(response.status, requestId);
    }
    const body = (await response.json()) as unknown;
    this.logger.debug(
      this.event('ppq_response_shape', {
        eNumber: candidate.eNumber,
        response: this.summarizeResponse(body),
      }),
    );
    return body;
  }

  private extractOutputText(
    response: z.infer<typeof ppqResponseSchema>,
  ): string {
    if (response.output_text) return response.output_text;
    const nestedText = (response.output ?? [])
      .flatMap((item) => item.content ?? [])
      .map((content) => content.text?.trim())
      .filter((text): text is string => Boolean(text))
      .join('\n');
    if (nestedText) return nestedText;
    throw new Error(
      `PPQ response ${response.id} contains no assistant text. Output shape: ${JSON.stringify(
        this.summarizeResponse(response),
      )}`,
    );
  }

  private parseStructuredOutput(outputText: string): unknown {
    const normalized = outputText
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '');
    try {
      return JSON.parse(normalized) as unknown;
    } catch {
      throw new Error(
        `PPQ assistant text is not valid JSON (${outputText.length} characters).`,
      );
    }
  }

  private summarizeResponse(value: unknown): object {
    if (!value || typeof value !== 'object') {
      return { valueType: typeof value };
    }
    const record = value as Record<string, unknown>;
    const output = Array.isArray(record.output) ? record.output : [];
    return {
      keys: Object.keys(record).sort(),
      id: typeof record.id === 'string' ? record.id : null,
      model: typeof record.model === 'string' ? record.model : null,
      status: typeof record.status === 'string' ? record.status : null,
      hasOutputText:
        typeof record.output_text === 'string' && record.output_text.length > 0,
      outputItems: output.map((item) => {
        if (!item || typeof item !== 'object') return { type: typeof item };
        const itemRecord = item as Record<string, unknown>;
        const content = Array.isArray(itemRecord.content)
          ? itemRecord.content
          : [];
        return {
          type: typeof itemRecord.type === 'string' ? itemRecord.type : null,
          status:
            typeof itemRecord.status === 'string' ? itemRecord.status : null,
          contentTypes: content.map((part) =>
            part &&
            typeof part === 'object' &&
            typeof (part as Record<string, unknown>).type === 'string'
              ? (part as Record<string, unknown>).type
              : null,
          ),
        };
      }),
    };
  }

  private summarizeZodError(error: z.ZodError): string {
    return error.issues
      .map((issue) => `${issue.path.join('.') || 'response'}: ${issue.message}`)
      .join('; ');
  }

  private event(name: string, details: Record<string, unknown>): string {
    return `${name} ${JSON.stringify(details)}`;
  }

  private instructions(): string {
    return [
      'Research the supplied food additive using current web sources.',
      'Prefer EFSA, EMA, FDA, WHO/JECFA, national health agencies, peer-reviewed research, and recognized teratology information services.',
      'Write concise neutral Spanish. Do not copy source prose.',
      'Pregnancy suitability must be SUITABLE or NOT_SUITABLE only when a cited source explicitly supports that conclusion for pregnancy at food-use exposure; otherwise use UNKNOWN.',
      'Do not infer safety merely from regulatory approval, an acceptable daily intake, missing warnings, or animal-only evidence.',
      'Return direct source URLs, not search-result URLs. Treat all generated content as requiring editorial and clinical review.',
    ].join(' ');
  }

  private responseFormat(): object {
    const nullableString = { type: ['string', 'null'] };
    return {
      type: 'json_schema',
      json_schema: {
        name: 'additive_research',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            description: nullableString,
            foodUses: nullableString,
            healthImpact: nullableString,
            lowDoseEffects: nullableString,
            highDoseEffects: nullableString,
            toxicityLevel: {
              type: ['string', 'null'],
              enum: ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH', null],
            },
            pregnancySuitability: {
              type: 'string',
              enum: ['SUITABLE', 'NOT_SUITABLE', 'UNKNOWN'],
            },
            pregnancyRationale: { type: 'string' },
            evidenceQuality: {
              type: 'string',
              enum: ['INSUFFICIENT', 'LIMITED', 'GOOD'],
            },
            citations: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  title: { type: 'string' },
                  url: { type: 'string' },
                  publisher: { type: 'string' },
                },
                required: ['title', 'url', 'publisher'],
              },
            },
          },
          required: [
            'description',
            'foodUses',
            'healthImpact',
            'lowDoseEffects',
            'highDoseEffects',
            'toxicityLevel',
            'pregnancySuitability',
            'pregnancyRationale',
            'evidenceQuality',
            'citations',
          ],
        },
      },
    };
  }

  private isTransient(error: Error): boolean {
    return (
      error.name === 'TimeoutError' ||
      (error instanceof PpqHttpError &&
        (error.status === 408 || error.status === 429 || error.status >= 500))
    );
  }

  private parseTimeout(value: string | undefined): number {
    const parsed = Number(value ?? 120_000);
    return Number.isInteger(parsed) && parsed >= 5_000 && parsed <= 300_000
      ? parsed
      : 120_000;
  }
}

class PpqHttpError extends Error {
  constructor(
    readonly status: number,
    requestId: string | null,
  ) {
    super(
      `PPQ request failed (${status})${requestId ? `, request ${requestId}` : ''}.`,
    );
  }
}
