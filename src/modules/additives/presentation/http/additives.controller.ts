import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { AnalyzeIngredientsService } from '../../application/services/analyze-ingredients.service';
import { AnalyzeIngredientsDto } from './dto/analyze-ingredients.dto';
import {
  AdditiveDetailResponse,
  AdditiveListItem,
  CursorPageResponse,
  searchAdditivesSchema,
} from '@ingredia/contracts';
import type { SearchAdditivesQuery } from '@ingredia/contracts';
import { ContractValidationPipe } from '../../../../common/http/contract-validation.pipe';
import { CatalogAdditivesService } from '../../application/services/catalog-additives.service';

@ApiTags('additives')
@Controller('additives')
export class AdditivesController {
  constructor(private readonly analyzeIngredients: AnalyzeIngredientsService) {}

  @Post('analyze-ingredients')
  @AllowAnonymous()
  @ApiOperation({
    summary: 'Analyze OCR or label ingredient text for additives',
  })
  @ApiBody({ type: AnalyzeIngredientsDto })
  analyze(@Body() body: unknown) {
    return this.analyzeIngredients.execute(body);
  }
}

@ApiTags('additives')
@AllowAnonymous()
@Controller('api/v1/additives')
export class VersionedAdditivesController {
  constructor(private readonly catalog: CatalogAdditivesService) {}

  @Get()
  search(
    @Query(new ContractValidationPipe(searchAdditivesSchema))
    query: SearchAdditivesQuery,
  ): Promise<CursorPageResponse<AdditiveListItem>> {
    return this.catalog.search(query);
  }

  @Get(':code')
  detail(@Param('code') code: string): Promise<AdditiveDetailResponse> {
    return this.catalog.detail(code);
  }
}
