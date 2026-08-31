export const TOXICITY_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'] as const;
export type ToxicityLevel = (typeof TOXICITY_LEVELS)[number];

export const PREGNANCY_SUITABILITIES = [
  'SUITABLE',
  'NOT_SUITABLE',
  'UNKNOWN',
] as const;
export type PregnancySuitability = (typeof PREGNANCY_SUITABILITIES)[number];

export interface AdditiveSourceEntry {
  sourceKey: string;
  sourceName: string;
  sourceBaseUrl: string;
  sourceUrl: string;
  eNumber: string;
  name: string;
  aliases: string[];
  description: string;
  foodUses: string;
  healthImpact: string;
  lowDoseEffects?: string;
  highDoseEffects?: string;
  toxicityLevel: ToxicityLevel;
  sourceClassification?: string;
  pregnancySuitability: PregnancySuitability;
  pregnancyRationale: string;
  contentHash: string;
  fetchedAt: Date;
}

export interface CatalogAdditive {
  id: string;
  eNumber: string;
  name: string;
  description: string;
  foodUses: string;
  healthImpact: string;
  lowDoseEffects: string | null;
  highDoseEffects: string | null;
  toxicityLevel: ToxicityLevel;
  pregnancySuitability: PregnancySuitability;
  pregnancyRationale: string;
}

export function normalizeENumber(value: string): string | null {
  const match = value.trim().match(/^e[\s-]?(\d{3,4}[a-z]{0,3})$/i);
  return match ? `E${match[1].toUpperCase()}` : null;
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function toxicityRank(level: ToxicityLevel): number {
  return TOXICITY_LEVELS.indexOf(level);
}
