import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateScanResponse, ScanResponse } from '@ingredia/contracts';
import { GetUserEntitlementsService } from '../../../billing/application/services/get-user-entitlements.service';
import { ANALYSIS_REPOSITORY } from '../ports/analysis.repository.port';
import type { AnalysisRepositoryPort } from '../ports/analysis.repository.port';
import {
  ImageUpload,
  ScanQuotaExceededError,
} from '../../domain/analysis.types';
import { ScanProcessorService } from './scan-processor.service';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
  'application/octet-stream',
]);

@Injectable()
export class ScansService {
  constructor(
    @Inject(ANALYSIS_REPOSITORY)
    private readonly repository: AnalysisRepositoryPort,
    private readonly entitlements: GetUserEntitlementsService,
    private readonly processor: ScanProcessorService,
  ) {}

  async create(
    userId: string,
    image: ImageUpload | undefined,
    productName?: string,
  ): Promise<CreateScanResponse> {
    if (!image) throw new BadRequestException('An image file is required.');

    if (!ALLOWED_IMAGE_TYPES.has(image.mimetype.toLowerCase())) {
      throw new BadRequestException('The image type is not supported.');
    }

    const normalizedName = productName?.trim();
    if (normalizedName && normalizedName.length > 200) {
      throw new BadRequestException(
        'productName must be at most 200 characters.',
      );
    }
    const quota = await this.entitlements.resolve(userId);
    try {
      const scan = await this.repository.createScan({
        userId,
        imageMimeType: image.mimetype,
        imageSize: image.size,
        productName: normalizedName || null,
        periodStart: quota.periodStart,
        monthlyLimit: quota.entitlements.unlimitedScans
          ? null
          : quota.monthlyLimit,
      });
      setImmediate(() => {
        void this.processor.process({
          userId,
          scanId: scan.id,
          image,
          requestedProductName: normalizedName || null,
        });
      });
      return {
        id: scan.id,
        status: scan.status,
        createdAt: scan.createdAt.toISOString(),
      };
    } catch (error: unknown) {
      if (error instanceof ScanQuotaExceededError) {
        throw new HttpException(error.message, HttpStatus.TOO_MANY_REQUESTS);
      }
      throw error;
    }
  }

  async get(userId: string, scanId: string): Promise<ScanResponse> {
    const scan = await this.repository.findScan(userId, scanId);
    if (!scan) throw new NotFoundException('Scan not found.');
    return {
      id: scan.id,
      status: scan.status,
      createdAt: scan.createdAt.toISOString(),
      productName: scan.productName,
      ingredientsText: scan.ingredientsText,
      ocrConfidence: scan.ocrConfidence,
      analysisId: scan.analysisId,
      failure: scan.failureCode
        ? {
            code: scan.failureCode,
            message: scan.failureMessage ?? 'Scan processing failed.',
            retryable: scan.failureRetryable ?? false,
          }
        : null,
    };
  }
}
