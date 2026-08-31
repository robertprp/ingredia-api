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
  inferPregnancyGuidance,
  sectionText,
  sha256,
} from './source-parser.utils';

@Injectable()
export class AditivosAlimentariosSource implements AdditiveSourcePort {
  readonly key = 'aditivos-alimentarios.com';
  readonly name = 'Aditivos Alimentarios';
  readonly baseUrl = 'https://www.aditivos-alimentarios.com';

  async list(): Promise<AdditiveSourceSummary[]> {
    const $ = load(await fetchHtml(`${this.baseUrl}/`));
    const entries = new Map<string, AdditiveSourceSummary>();
    $('.post-body tr').each((_, row) => {
      const cells = $(row).find('td');
      const eNumber = normalizeENumber(cleanText(cells.eq(0).text()));
      const href = cells.eq(0).find('a').attr('href');
      if (!eNumber || !href) return;
      entries.set(eNumber, {
        eNumber,
        name: cleanText(cells.eq(1).text()),
        detailUrl: new URL(href, this.baseUrl).toString(),
        listedClassification: cleanText(cells.eq(2).text()),
      });
    });
    return [...entries.values()];
  }

  async fetchDetails(
    summary: AdditiveSourceSummary,
  ): Promise<AdditiveSourceEntry> {
    const html = await fetchHtml(summary.detailUrl);
    const $ = load(html);
    const root = $('.post-body.entry-content').first();
    const description = sectionText(
      $,
      root.find('#descripcion-del-aditivo'),
      'h2',
    );
    const foodUses = sectionText($, root.find('#usos-alimentarios'), 'h2');
    const effectsHeading = root.find('#efectos-secundarios');
    const healthImpact = sectionText($, effectsHeading, 'h2');
    const toxicityText = sectionText($, root.find('#nivel-de-toxicidad'), 'h2');
    const synonyms = cleanText(
      root
        .find('#nombres-sinonimos')
        .nextUntil('h2')
        .find('tr')
        .first()
        .find('td')
        .eq(1)
        .text(),
    );
    const pregnancy = inferPregnancyGuidance(healthImpact);
    const { lowDoseEffects, highDoseEffects } = this.splitDoseEffects(
      $,
      effectsHeading.nextUntil('h2').text(),
    );

    return {
      sourceKey: this.key,
      sourceName: this.name,
      sourceBaseUrl: this.baseUrl,
      sourceUrl: summary.detailUrl,
      eNumber: summary.eNumber,
      name: summary.name,
      aliases: synonyms.split(',').map(cleanText).filter(Boolean),
      description:
        description || 'Información pendiente de revisión en la fuente.',
      foodUses:
        foodUses || 'Usos alimentarios pendientes de revisión en la fuente.',
      healthImpact:
        healthImpact ||
        'Impacto en la salud pendiente de revisión en la fuente.',
      lowDoseEffects,
      highDoseEffects,
      toxicityLevel: this.mapToxicity(
        toxicityText || summary.listedClassification,
      ),
      sourceClassification: toxicityText || summary.listedClassification,
      pregnancySuitability: pregnancy.suitability,
      pregnancyRationale: pregnancy.rationale,
      contentHash: sha256(html),
      fetchedAt: new Date(),
    };
  }

  private splitDoseEffects(
    $: ReturnType<typeof load>,
    effectsText: string,
  ): { lowDoseEffects?: string; highDoseEffects?: string } {
    const text = cleanText($('<div>').html(effectsText).text());
    const parts = text.split(/Dosis altas\s*:/i);
    const low = cleanText(parts[0].replace(/Dosis bajas\s*:/i, ''));
    const high = cleanText(parts.slice(1).join(' '));
    return {
      ...(low ? { lowDoseEffects: low } : {}),
      ...(high ? { highDoseEffects: high } : {}),
    };
  }

  private mapToxicity(value?: string): ToxicityLevel {
    if (/muy alta/i.test(value ?? '')) return 'VERY_HIGH';
    if (/alta/i.test(value ?? '')) return 'HIGH';
    if (/media/i.test(value ?? '')) return 'MEDIUM';
    return 'LOW';
  }
}
