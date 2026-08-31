import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ADDITIVE_REPOSITORY } from '../ports/additive.repository.port';
import type { AdditiveRepositoryPort } from '../ports/additive.repository.port';
import {
  normalizeENumber,
  normalizeSearchText,
  toxicityRank,
} from '../../domain/additive.types';

export type ProductToxicityAssessment =
  'TOXIC' | 'CAUTION' | 'NOT_TOXIC' | 'UNKNOWN';

@Injectable()
export class AnalyzeIngredientsService {
  constructor(
    @Inject(ADDITIVE_REPOSITORY)
    private readonly repository: AdditiveRepositoryPort,
  ) {}

  async execute(input: unknown) {
    const request = this.validate(input);
    const eNumbers = this.extractENumbers(request.ingredients);
    const normalizedNames = this.buildNameCandidates(request.ingredients);
    const additives = await this.repository.findForIngredientAnalysis({
      eNumbers,
      normalizedNames,
    });
    const highestRank = additives.reduce(
      (rank, additive) => Math.max(rank, toxicityRank(additive.toxicityLevel)),
      -1,
    );
    const assessment: ProductToxicityAssessment =
      highestRank >= 2
        ? 'TOXIC'
        : highestRank === 1
          ? 'CAUTION'
          : highestRank === 0
            ? 'NOT_TOXIC'
            : 'UNKNOWN';
    const pregnancyWarnings = request.isPregnant
      ? additives.filter(
          (additive) => additive.pregnancySuitability !== 'SUITABLE',
        )
      : [];

    return {
      assessment,
      analyzedForPregnancy: request.isPregnant,
      pregnancyAssessment: request.isPregnant
        ? pregnancyWarnings.some(
            (additive) => additive.pregnancySuitability === 'NOT_SUITABLE',
          )
          ? 'NOT_RECOMMENDED'
          : pregnancyWarnings.length
            ? 'INSUFFICIENT_DATA'
            : 'NO_WARNING_IDENTIFIED'
        : 'NOT_REQUESTED',
      detectedAdditives: additives,
      unmatchedENumbers: eNumbers.filter(
        (eNumber) =>
          !additives.some((additive) => additive.eNumber === eNumber),
      ),
      disclaimer:
        'Resultado informativo basado en fuentes indexadas; no sustituye asesoramiento médico ni una evaluación oficial de seguridad alimentaria.',
    };
  }

  private validate(input: unknown): {
    ingredients: string;
    isPregnant: boolean;
  } {
    if (typeof input !== 'object' || input === null) {
      throw new BadRequestException('A JSON body is required.');
    }
    const record = input as Record<string, unknown>;
    const ingredients = record['ingredients'];
    const isPregnant = record['isPregnant'];
    if (
      typeof ingredients !== 'string' ||
      !ingredients.trim() ||
      ingredients.length > 10_000
    ) {
      throw new BadRequestException(
        'ingredients must be a non-empty string of at most 10000 characters.',
      );
    }
    if (isPregnant !== undefined && typeof isPregnant !== 'boolean') {
      throw new BadRequestException('isPregnant must be a boolean.');
    }
    return { ingredients, isPregnant: isPregnant ?? false };
  }

  private extractENumbers(ingredients: string): string[] {
    const matches = ingredients.matchAll(/\bE[\s-]?(\d{3,4}[a-z]{0,3})\b/gi);
    return [
      ...new Set(
        [...matches]
          .map((match) => normalizeENumber(`E${match[1]}`))
          .filter((value): value is string => value !== null),
      ),
    ];
  }

  private buildNameCandidates(ingredients: string): string[] {
    const candidates = new Set<string>();
    for (const segment of ingredients.split(/[,;\n()[\]]/)) {
      const tokens = normalizeSearchText(segment).split(' ').filter(Boolean);
      for (let start = 0; start < tokens.length; start += 1) {
        for (
          let length = 1;
          length <= 6 && start + length <= tokens.length;
          length += 1
        ) {
          candidates.add(tokens.slice(start, start + length).join(' '));
          if (candidates.size >= 500) return [...candidates];
        }
      }
    }
    return [...candidates];
  }
}
