import { Injectable } from '@nestjs/common';
import { ALLOWED_SERVICE_PATHS } from './blog-keywords.data';
import {
  ExistingBlogPost,
  GeneratedBlogPost,
  QualityReport,
  TopicCluster,
} from './blog-generation.types';

@Injectable()
export class BlogQualityService {
  validate(
    post: GeneratedBlogPost,
    cluster: TopicCluster,
    existingPosts: ExistingBlogPost[] = [],
  ): QualityReport {
    const errors: string[] = [];

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug) || post.slug.length > 100) {
      errors.push('slug must be unique-looking kebab-case and no longer than 100 characters');
    }
    if (existingPosts.some((existing) => existing.slug === post.slug)) {
      errors.push('slug already exists');
    }
    if (post.date !== new Date().toISOString().slice(0, 10)) {
      errors.push('date must be today');
    }
    if (!Number.isInteger(post.readingTime) || post.readingTime < 4 || post.readingTime > 20) {
      errors.push('readingTime must be an integer between 4 and 20');
    }

    for (const language of ['ru', 'kz'] as const) {
      this.validateTextLength(errors, `${language}.title`, post.title?.[language], 35, 90);
      this.validateTextLength(errors, `${language}.description`, post.description?.[language], 120, 180);
      this.validateTextLength(errors, `${language}.excerpt`, post.excerpt?.[language], 140, 320);
      this.validateTextLength(errors, `${language}.category`, post.category?.[language], 2, 60);

      const keywords = post.keywords?.[language];
      if (!Array.isArray(keywords) || keywords.length < 4 || keywords.length > 10) {
        errors.push(`${language}.keywords must contain 4-10 phrases`);
      } else if (new Set(keywords.map((keyword) => this.normalize(keyword))).size !== keywords.length) {
        errors.push(`${language}.keywords contains duplicates`);
      }

      const html = post.content?.[language] || '';
      this.validateHtml(errors, html, language);
      const plainText = this.plainText(html);
      const wordCount = plainText.split(/\s+/).filter(Boolean).length;
      if (wordCount < 700 || wordCount > 2200) {
        errors.push(`${language}.content must contain 700-2200 words (got ${wordCount})`);
      }
      if (!this.hasCallToAction(plainText, language)) {
        errors.push(`${language}.content must contain a clear consultation/contact CTA`);
      }
      this.validateClaims(errors, plainText, language);
      this.validateKeywordUse(errors, plainText, keywords || [], language);
    }

    const plannedTerms = [cluster.service, cluster.city, ...cluster.keywords];
    const generatedTerms = [post.title.ru, post.slug, ...(post.keywords?.ru || [])];
    if (this.similarity(plannedTerms.join(' '), generatedTerms.join(' ')) < 0.08) {
      errors.push('generated post does not match the planned commercial cluster');
    }

    for (const existing of existingPosts) {
      const similarity = this.similarity(
        generatedTerms.join(' '),
        [existing.slug, existing.title, ...existing.keywords].join(' '),
      );
      if (similarity >= 0.48) {
        errors.push(`topic cannibalizes existing post "${existing.slug}"`);
        break;
      }
    }

    return { passed: errors.length === 0, errors };
  }

  private validateTextLength(
    errors: string[],
    field: string,
    value: unknown,
    minimum: number,
    maximum: number,
  ): void {
    if (typeof value !== 'string' || value.trim().length < minimum || value.trim().length > maximum) {
      errors.push(`${field} must contain ${minimum}-${maximum} characters`);
    }
  }

  private validateHtml(errors: string[], html: string, language: 'ru' | 'kz'): void {
    if (!html || /<(script|style|iframe|object|form)\b/i.test(html) || /\son\w+=/i.test(html)) {
      errors.push(`${language}.content contains missing or unsafe HTML`);
      return;
    }
    const allowedTags = new Set(['h2', 'h3', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'a']);
    for (const match of html.matchAll(/<\/?([a-z0-9]+)\b[^>]*>/gi)) {
      if (!allowedTags.has(match[1].toLowerCase())) {
        errors.push(`${language}.content contains disallowed <${match[1]}> tag`);
      }
    }
    if ((html.match(/<h2\b/gi) || []).length < 3 || (html.match(/<p\b/gi) || []).length < 6) {
      errors.push(`${language}.content needs at least 3 h2 and 6 paragraphs`);
    }

    const links = [...html.matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi)].map((match) => match[1]);
    if (links.length < 2 || links.length > 5) {
      errors.push(`${language}.content must contain 2-5 internal service links`);
    }
    for (const href of links) {
      const match = href.match(new RegExp(`^/${language}/services/([a-z-]+)$`));
      if (!match || !ALLOWED_SERVICE_PATHS.has(match[1])) {
        errors.push(`${language}.content has invalid internal link "${href}"`);
      }
    }
  }

  private validateClaims(errors: string[], text: string, language: 'ru' | 'kz'): void {
    const forbidden = [
      /\b(гарантируем|гарантия|кепілдік береміз|кепілдік)\b/i,
      /\b(наш клиент|наши клиенты|біздің клиент|кейс клиента|клиент кейсі)\b/i,
      /\b(увеличили|сэкономили|арттырдық|үнемдедік)\b.{0,35}\b\d+\s*%/i,
      /\b\d+\+?\s*(проектов|клиентов|жобалар|клиенттер)\b/i,
    ];
    if (forbidden.some((pattern) => pattern.test(text))) {
      errors.push(`${language}.content contains unverifiable case study, guarantee, or performance claim`);
    }
  }

  private validateKeywordUse(
    errors: string[],
    text: string,
    keywords: string[],
    language: 'ru' | 'kz',
  ): void {
    const normalizedText = this.normalize(text);
    for (const keyword of keywords) {
      const phrase = this.normalize(keyword);
      if (!phrase) continue;
      const occurrences = normalizedText.split(phrase).length - 1;
      if (occurrences > 4) {
        errors.push(`${language}.content overuses keyword "${keyword}"`);
      }
    }
  }

  private hasCallToAction(text: string, language: 'ru' | 'kz'): boolean {
    return language === 'ru'
      ? /(обсудить|оставьте заявку|свяжитесь|консультац)/i.test(text)
      : /(талқыла|өтінім қалдыр|хабарлас|кеңес)/i.test(text);
  }

  private plainText(html: string): string {
    return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&amp;|&quot;|&#39;/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private normalize(value: string): string {
    return value.toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-яәіңғүұқөһ0-9]+/gi, ' ').replace(/\s+/g, ' ').trim();
  }

  private similarity(left: string, right: string): number {
    const leftTokens = new Set(this.normalize(left).split(' ').filter((token) => token.length > 2));
    const rightTokens = new Set(this.normalize(right).split(' ').filter((token) => token.length > 2));
    const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
    return intersection / Math.max(1, new Set([...leftTokens, ...rightTokens]).size);
  }
}
