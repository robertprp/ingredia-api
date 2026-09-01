import { ImageAnnotatorClient, protos } from '@google-cloud/vision';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import convertHeic from 'heic-convert';
import { OcrPort } from '../../application/ports/ocr.port';
import {
  ImageUpload,
  OcrFailureError,
  OcrResult,
} from '../../domain/analysis.types';

const INGREDIENTS_HEADING =
  /(?:^|\n)\s*(?:ingredientes?|ingredients?|ingr[eé]dients?|ingredienti|zutaten)\s*[:：-]?\s*/iu;
const SECTION_END_HEADING =
  /\n\s*(?:informaci[oó]n\s+nutricional|declaraci[oó]n\s+nutricional|nutrition(?:al)?\s+(?:facts|information)|valeurs?\s+nutritionnelles?|n[aä]hrwert(?:angaben|information(?:en)?)?|valori\s+nutrizionali|conservaci[oó]n|modo\s+de\s+empleo|fabricado\s+por|distribuido\s+por)\s*[:：-]?/iu;
const HEIF_MIME_TYPES = new Set([
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
]);

@Injectable()
export class GoogleVisionOcrAdapter implements OcrPort {
  private readonly client: ImageAnnotatorClient;

  constructor(config: ConfigService) {
    this.client = new ImageAnnotatorClient({
      projectId: config.getOrThrow<string>('GOOGLE_CLOUD_PROJECT'),
      apiKey: config.getOrThrow<string>('GOOGLE_CLOUD_VISION_API_KEY'),
      apiEndpoint: config.get<string>(
        'GOOGLE_CLOUD_VISION_ENDPOINT',
        'eu-vision.googleapis.com',
      ),
    });
  }

  async recognize(image: ImageUpload): Promise<OcrResult> {
    const imageBuffer = await this.toVisionCompatibleBuffer(image);
    try {
      const [batch] = await this.client.batchAnnotateImages(
        {
          requests: [
            {
              image: { content: imageBuffer },
              features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
              imageContext: {
                languageHints: ['es', 'en', 'ca', 'fr', 'pt', 'it', 'de'],
              },
            },
          ],
        },
        { timeout: 15_000 },
      );
      const response = batch.responses?.[0];
      if (response?.error) {
        throw this.providerFailure(response.error.code);
      }

      const annotation = response?.fullTextAnnotation;
      const text = annotation?.text?.trim();
      if (!text) {
        throw new OcrFailureError(
          'OCR_TEXT_NOT_FOUND',
          'The OCR provider did not detect text in the image.',
          false,
        );
      }

      return {
        ingredientsText: this.extractIngredients(text),
        productName: null,
        confidence: this.averageWordConfidence(annotation?.pages ?? []),
      };
    } catch (error: unknown) {
      if (error instanceof OcrFailureError) throw error;
      throw this.providerFailure(this.errorCode(error));
    }
  }

  private async toVisionCompatibleBuffer(image: ImageUpload): Promise<Buffer> {
    if (!HEIF_MIME_TYPES.has(image.mimetype.toLowerCase())) {
      return image.buffer;
    }

    try {
      const converted = await convertHeic({
        buffer: image.buffer,
        format: 'JPEG',
        quality: 0.92,
      });
      return Buffer.from(converted);
    } catch {
      throw new OcrFailureError(
        'HEIC_DECODE_FAILED',
        'The uploaded HEIC image could not be decoded.',
        false,
      );
    }
  }

  private errorCode(error: unknown): number | undefined {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof error.code === 'number'
    ) {
      return error.code;
    }
    return undefined;
  }

  private providerFailure(code: number | null | undefined): OcrFailureError {
    switch (code) {
      case 3:
        return new OcrFailureError(
          'OCR_PROVIDER_REJECTED',
          'The OCR provider rejected the image.',
          false,
        );
      case 7:
      case 16:
        return new OcrFailureError(
          'OCR_PROVIDER_AUTH_FAILED',
          'The OCR provider credentials or permissions are invalid.',
          false,
        );
      case 8:
        return new OcrFailureError(
          'OCR_PROVIDER_QUOTA_EXCEEDED',
          'The OCR provider quota has been exceeded.',
          true,
        );
      case 4:
      case 14:
        return new OcrFailureError(
          'OCR_PROVIDER_UNAVAILABLE',
          'The OCR provider is unavailable or timed out.',
          true,
        );
      default:
        return new OcrFailureError(
          'OCR_PROVIDER_FAILED',
          'The OCR provider request failed.',
          true,
        );
    }
  }

  private extractIngredients(text: string): string {
    const heading = INGREDIENTS_HEADING.exec(text);
    const candidate = heading
      ? text.slice(heading.index + heading[0].length)
      : text;
    const endHeading = SECTION_END_HEADING.exec(candidate);
    return candidate
      .slice(0, endHeading?.index ?? candidate.length)
      .trim()
      .slice(0, 10_000);
  }

  private averageWordConfidence(
    pages: protos.google.cloud.vision.v1.IPage[],
  ): number | null {
    const confidences = pages.flatMap((page) =>
      (page.blocks ?? []).flatMap((block) =>
        (block.paragraphs ?? []).flatMap((paragraph) =>
          (paragraph.words ?? [])
            .map((word) => word.confidence)
            .filter((value): value is number => typeof value === 'number'),
        ),
      ),
    );
    if (confidences.length === 0) return null;
    return (
      confidences.reduce((total, confidence) => total + confidence, 0) /
      confidences.length
    );
  }
}
