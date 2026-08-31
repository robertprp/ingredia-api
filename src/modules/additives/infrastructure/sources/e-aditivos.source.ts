import { Injectable } from '@nestjs/common';
import { load } from 'cheerio';
import {
  AdditiveSourcePort,
  AdditiveSourceSummary,
} from '../../application/ports/additive-source.port';
import {
  AdditiveSourceEntry,
  normalizeENumber,
  ToxicityLevel,
} from '../../domain/additive.types';
import {
  cleanText,
  fetchHtml,
  headingContaining,
  inferPregnancyGuidance,
  sectionText,
  sha256,
} from './source-parser.utils';

@Injectable()
export class EAditivosSource implements AdditiveSourcePort {
  readonly key = 'e-aditivos.com';
  readonly name = 'E-Aditivos';
  readonly baseUrl = 'https://e-aditivos.com';

  async list(): Promise<AdditiveSourceSummary[]> {
    const $ = load(await fetchHtml(`${this.baseUrl}/`));
    const entries = new Map<string, AdditiveSourceSummary>();
    $('a[href]').each((_, anchor) => {
      const href = $(anchor).attr('href');
      if (!href) return;
      const hrefMatch = href.match(
        /^\/[Ee]-([0-9]{3,4}[a-z]{0,3})(?:\.html)?$/i,
      );
      if (!hrefMatch) return;
      const eNumber = normalizeENumber(`E${hrefMatch[1]}`);
      if (!eNumber || entries.has(eNumber)) return;
      const row = $(anchor).closest('tr');
      const cells = row.find('td');
      entries.set(eNumber, {
        eNumber,
        name: cleanText(cells.eq(3).text()) || eNumber,
        detailUrl: new URL(href, this.baseUrl).toString(),
        listedClassification: cleanText(cells.eq(1).text()),
      });
    });
    return [...entries.values()];
  }

  async fetchDetails(
    summary: AdditiveSourceSummary,
  ): Promise<AdditiveSourceEntry> {
    const html = await fetchHtml(summary.detailUrl);
    const $ = load(html);
    const rootSelector = 'article.aditive .description';
    const article = $('article.aditive');
    const names = cleanText(article.find('header h2').first().text())
      .split(',')
      .map(cleanText)
      .filter(Boolean);
    const descriptionHeading = headingContaining(
      $,
      rootSelector,
      'h3',
      /¿?qu[eé] es/i,
    );
    const usesHeading = headingContaining(
      $,
      rootSelector,
      'h3',
      /uso en la industria alimentaria/i,
    );
    const healthHeading = headingContaining(
      $,
      rootSelector,
      'h3',
      /impacto en la salud/i,
    );
    const precautionsHeading = headingContaining(
      $,
      rootSelector,
      'h3',
      /precauciones/i,
    );
    const description = sectionText($, descriptionHeading, 'h3');
    const foodUses = sectionText($, usesHeading, 'h3');
    const healthImpact = sectionText($, healthHeading, 'h3');
    const precautions = sectionText($, precautionsHeading, 'h3');
    const classification =
      cleanText(article.find('.pattern .icons .searchterm').first().text()) ||
      summary.listedClassification;
    const pregnancy = inferPregnancyGuidance(`${healthImpact} ${precautions}`);

    return {
      sourceKey: this.key,
      sourceName: this.name,
      sourceBaseUrl: this.baseUrl,
      sourceUrl: summary.detailUrl,
      eNumber: summary.eNumber,
      name: names[0] ?? summary.name,
      aliases: names.slice(1),
      description:
        description || 'Información pendiente de revisión en la fuente.',
      foodUses:
        foodUses || 'Usos alimentarios pendientes de revisión en la fuente.',
      healthImpact:
        [healthImpact, precautions].filter(Boolean).join(' ') ||
        'Impacto en la salud pendiente de revisión en la fuente.',
      toxicityLevel: this.mapToxicity(classification),
      sourceClassification: classification,
      pregnancySuitability: pregnancy.suitability,
      pregnancyRationale: pregnancy.rationale,
      contentHash: sha256(html),
      fetchedAt: new Date(),
    };
  }

  private mapToxicity(value?: string): ToxicityLevel {
    if (/muy (peligroso|nocivo)|extrem/i.test(value ?? '')) return 'VERY_HIGH';
    if (
      /peligroso|nocivo/i.test(value ?? '') &&
      !/no nocivo/i.test(value ?? '')
    ) {
      return 'HIGH';
    }
    if (/sospechoso/i.test(value ?? '')) return 'MEDIUM';
    return 'LOW';
  }
}
