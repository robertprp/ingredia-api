import { createHash } from 'node:crypto';
import type { CheerioAPI } from 'cheerio';
import { PregnancySuitability } from '../../domain/additive.types';

export function cleanText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function sectionText(
  $: CheerioAPI,
  heading: ReturnType<CheerioAPI>,
  headingSelector: string,
): string {
  if (!heading.length) return '';
  const parts: string[] = [];
  let current = heading.next();
  while (current.length && !current.is(headingSelector)) {
    const text = cleanText(current.text());
    if (text) parts.push(text);
    current = current.next();
  }
  return cleanText(parts.join(' '));
}

export function headingContaining(
  $: CheerioAPI,
  rootSelector: string,
  headingSelector: string,
  expectedText: RegExp,
): ReturnType<CheerioAPI> {
  return $(rootSelector)
    .find(headingSelector)
    .filter((_, element) => expectedText.test(cleanText($(element).text())))
    .first();
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function inferPregnancyGuidance(text: string): {
  suitability: PregnancySuitability;
  rationale: string;
} {
  const normalized = cleanText(text);
  const mentionsPregnancy = /embarazad|embarazo|gestaci[oó]n/i.test(normalized);
  const warns =
    /(no (?:es )?recomend|desaconsejad|evitar|precauci[oó]n|perjudicial|contraindicad|limitar).{0,100}(embarazad|embarazo|gestaci[oó]n)|(embarazad|embarazo|gestaci[oó]n).{0,100}(no (?:es )?recomend|desaconsejad|evitar|precauci[oó]n|perjudicial|contraindicad|limitar)/i.test(
      normalized,
    );
  if (mentionsPregnancy && warns) {
    return {
      suitability: 'NOT_SUITABLE',
      rationale:
        'La fuente consultada recomienda evitar o limitar este aditivo durante el embarazo; requiere validación clínica editorial.',
    };
  }
  const explicitlySuitable =
    /(segur[oa]|apto).{0,80}(embarazad|embarazo|gestaci[oó]n)|(embarazad|embarazo|gestaci[oó]n).{0,80}(segur[oa]|apto)/i.test(
      normalized,
    );
  if (explicitlySuitable) {
    return {
      suitability: 'SUITABLE',
      rationale:
        'La fuente consultada lo describe explícitamente como apto o seguro durante el embarazo; requiere validación clínica editorial.',
    };
  }
  return {
    suitability: 'UNKNOWN',
    rationale:
      'Las fuentes indexadas no aportan una conclusión explícita y suficiente sobre su uso durante el embarazo.',
  };
}

export async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'user-agent':
        'AditivosAppIndexer/1.0 (+catalog ingestion; contact configured by operator)',
      accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`Source request failed (${response.status}) for ${url}`);
  }
  return response.text();
}
