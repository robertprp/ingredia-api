import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AnalyzeIngredientsDto {
  @ApiProperty({
    example: 'Agua, azúcar, conservador E-202, colorante tartrazina',
    maxLength: 10000,
  })
  ingredients!: string;

  @ApiPropertyOptional({ default: false })
  isPregnant?: boolean;
}
