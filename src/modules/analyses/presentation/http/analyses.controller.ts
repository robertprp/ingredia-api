import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import {
  AnalysisListItem,
  CreateScanResponse,
  CursorPageResponse,
  ProductAnalysisResponse,
  ProductComparisonResponse,
  SavedAnalysisResponse,
  ScanResponse,
  createComparisonSchema,
  listUserAnalysesSchema,
  updateSavedAnalysisSchema,
} from '@ingredia/contracts';
import type {
  CreateComparisonRequest,
  ListUserAnalysesQuery,
  UpdateSavedAnalysisRequest,
} from '@ingredia/contracts';
import type { BetterAuth } from '../../../../common/auth/better-auth.type';
import { ContractValidationPipe } from '../../../../common/http/contract-validation.pipe';
import { AnalysesService } from '../../application/services/analyses.service';
import { ComparisonsService } from '../../application/services/comparisons.service';
import { ScansService } from '../../application/services/scans.service';
import { ImageUpload } from '../../domain/analysis.types';

@Controller('api/v1/scans')
export class ScansController {
  constructor(private readonly scans: ScansService) {}

  @Post()
  @HttpCode(202)
  @UseInterceptors(
    FileInterceptor('image', { limits: { fileSize: 8_000_000 } }),
  )
  create(
    @Session() session: UserSession<BetterAuth>,
    @UploadedFile() image: ImageUpload | undefined,
    @Body('productName') productName?: string,
  ): Promise<CreateScanResponse> {
    return this.scans.create(session.user.id, image, productName);
  }

  @Get(':scanId')
  get(
    @Session() session: UserSession<BetterAuth>,
    @Param('scanId', new ParseUUIDPipe()) scanId: string,
  ): Promise<ScanResponse> {
    return this.scans.get(session.user.id, scanId);
  }
}

@Controller('api/v1/analyses')
export class AnalysesController {
  constructor(private readonly analyses: AnalysesService) {}

  @Get()
  list(
    @Session() session: UserSession<BetterAuth>,
    @Query(new ContractValidationPipe(listUserAnalysesSchema))
    query: ListUserAnalysesQuery,
  ): Promise<CursorPageResponse<AnalysisListItem>> {
    return this.analyses.list(session.user.id, query);
  }

  @Get(':analysisId')
  get(
    @Session() session: UserSession<BetterAuth>,
    @Param('analysisId', new ParseUUIDPipe()) analysisId: string,
  ): Promise<ProductAnalysisResponse> {
    return this.analyses.get(session.user.id, analysisId);
  }

  @Patch(':analysisId/saved')
  save(
    @Session() session: UserSession<BetterAuth>,
    @Param('analysisId', new ParseUUIDPipe()) analysisId: string,
    @Body(new ContractValidationPipe(updateSavedAnalysisSchema))
    body: UpdateSavedAnalysisRequest,
  ): Promise<SavedAnalysisResponse> {
    return this.analyses.save(session.user.id, analysisId, body.saved);
  }

  @Delete(':analysisId')
  @HttpCode(204)
  delete(
    @Session() session: UserSession<BetterAuth>,
    @Param('analysisId', new ParseUUIDPipe()) analysisId: string,
  ): Promise<void> {
    return this.analyses.delete(session.user.id, analysisId);
  }
}

@Controller('api/v1/comparisons')
export class ComparisonsController {
  constructor(private readonly comparisons: ComparisonsService) {}

  @Post()
  create(
    @Session() session: UserSession<BetterAuth>,
    @Body(new ContractValidationPipe(createComparisonSchema))
    body: CreateComparisonRequest,
  ): Promise<ProductComparisonResponse> {
    return this.comparisons.create(session.user.id, body);
  }
}
