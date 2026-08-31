import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { AnalyzeIngredientsService } from '../../application/services/analyze-ingredients.service';
import { AnalyzeIngredientsDto } from './dto/analyze-ingredients.dto';

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
