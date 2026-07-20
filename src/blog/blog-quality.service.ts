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
  normalize(post: GeneratedBlogPost, cluster: TopicCluster): GeneratedBlogPost {
    const today = new Date().toISOString().slice(0, 10);
    const readingTime = Number.isFinite(Number(post.readingTime))
      ? Math.min(20, Math.max(4, Math.round(Number(post.readingTime))))
      : 8;

    return {
      ...post,
      slug: this.normalizeSlug(post.slug, cluster),
      date: today,
      readingTime,
      title: this.ensureLocalized(post.title),
      description: this.ensureLocalized(post.description),
      excerpt: this.ensureLocalized(post.excerpt),
      category: {
        ru: post.category?.ru?.trim() || cluster.category.ru,
        en: post.category?.en || '',
        kz: post.category?.kz?.trim() || cluster.category.kz,
      },
      keywords: {
        ru: this.normalizeKeywords(post.keywords?.ru),
        en: [],
        kz: this.normalizeKeywords(post.keywords?.kz),
      },
      content: {
        ru: this.sanitizeHtml(post.content?.ru || ''),
        en: '',
        kz: this.sanitizeHtml(post.content?.kz || ''),
      },
      published: Boolean(post.published),
    };
  }

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
      this.validateTextLength(errors, `${language}.title`, post.title?.[language], 20, 120);
      this.validateTextLength(errors, `${language}.description`, post.description?.[language], 80, 220);
      this.validateTextLength(errors, `${language}.excerpt`, post.excerpt?.[language], 80, 400);
      this.validateTextLength(errors, `${language}.category`, post.category?.[language], 2, 60);

      const keywords = post.keywords?.[language];
      if (!Array.isArray(keywords) || keywords.length < 3 || keywords.length > 12) {
        errors.push(`${language}.keywords must contain 3-12 phrases`);
      } else if (new Set(keywords.map((keyword) => this.normalizeText(keyword))).size !== keywords.length) {
        errors.push(`${language}.keywords contains duplicates`);
      }

      const html = post.content?.[language] || '';
      this.validateHtml(errors, html, language);
      const plainText = this.plainText(html);
      const wordCount = plainText.split(/\s+/).filter(Boolean).length;
      if (wordCount < 450 || wordCount > 2800) {
        errors.push(`${language}.content must contain 450-2800 words (got ${wordCount})`);
      }
      if (!this.hasCallToAction(plainText, language)) {
        errors.push(`${language}.content must contain a clear consultation/contact CTA`);
      }
      this.validateClaims(errors, plainText, language);
      this.validateKeywordUse(errors, plainText, keywords || [], language);
    }

    const plannedTerms = [cluster.service, cluster.city, ...cluster.keywords];
    const generatedTerms = [post.title.ru, post.slug, ...(post.keywords?.ru || [])];
    if (this.similarity(plannedTerms.join(' '), generatedTerms.join(' ')) < 0.03) {
      errors.push('generated post does not match the planned commercial cluster');
    }

    for (const existing of existingPosts) {
      const similarity = this.similarity(
        generatedTerms.join(' '),
        [existing.slug, existing.title, ...existing.keywords].join(' '),
      );
      if (similarity >= 0.72) {
        errors.push(`topic cannibalizes existing post "${existing.slug}"`);
        break;
      }
    }

    return { passed: errors.length === 0, errors };
  }

  private ensureLocalized(value?: { ru?: string; en?: string; kz?: string }) {
    return {
      ru: (value?.ru || '').trim(),
      en: value?.en || '',
      kz: (value?.kz || '').trim(),
    };
  }

  private normalizeKeywords(keywords?: string[]): string[] {
    const unique: string[] = [];
    const seen = new Set<string>();
    for (const keyword of keywords || []) {
      const trimmed = keyword.trim().replace(/\s+/g, ' ');
      const key = this.normalizeText(trimmed);
      if (!trimmed || seen.has(key)) continue;
      seen.add(key);
      unique.push(trimmed);
      if (unique.length >= 12) break;
    }
    return unique;
  }

  private normalizeSlug(slug: string | undefined, cluster: TopicCluster): string {
    const source = (slug || `${cluster.servicePath}-${cluster.city}-${Date.now()}`)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100);
    return source || `blog-post-${Date.now()}`;
  }

  private sanitizeHtml(html: string): string {
    return html
      .replace(/<(script|style|iframe|object|form)[\s\S]*?<\/\1>/gi, '')
      .replace(/<\/?(script|style|iframe|object|form)\b[^>]*>/gi, '')
      .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
      .replace(/<\/?h1\b[^>]*>/gi, '')
      .trim();
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
    if ((html.match(/<h2\b/gi) || []).length < 2 || (html.match(/<p\b/gi) || []).length < 4) {
      errors.push(`${language}.content needs at least 2 h2 and 4 paragraphs`);
    }

    const links = [...html.matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi)].map((match) => match[1]);
    if (links.length < 1 || links.length > 6) {
      errors.push(`${language}.content must contain 1-6 internal service links`);
    }
    for (const href of links) {
      const match = href.match(new RegExp(`^/${language}/services/([a-z-]+)/?$`));
      if (!match || !ALLOWED_SERVICE_PATHS.has(match[1])) {
        errors.push(`${language}.content has invalid internal link "${href}"`);
      }
    }
  }

  private validateClaims(errors: string[], text: string, language: 'ru' | 'kz'): void {
    const forbidden = [
      /\b(гарантируем|гарантия результата|кепілдік береміз)\b/i,
      /\b(наш клиент|наши клиенты|біздің клиент|кейс клиента|клиент кейсі)\b/i,
      /\b(мы увеличили|мы сэкономили|біз арттырдық|біз үнемдедік)\b.{0,35}\b\d+\s*%/i,
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
    const normalizedText = this.normalizeText(text);
    for (const keyword of keywords) {
      const phrase = this.normalizeText(keyword);
      if (!phrase) continue;
      const occurrences = normalizedText.split(phrase).length - 1;
      if (occurrences > 6) {
        errors.push(`${language}.content overuses keyword "${keyword}"`);
      }
    }
  }

  private hasCallToAction(text: string, language: 'ru' | 'kz'): boolean {
    return language === 'ru'
      ? /(обсудить|оставьте заявку|свяжитесь|консультац|напишите|whatsapp|whatsapp)/i.test(text)
      : /(талқыла|өтінім|хабарлас|кеңес|байланыс|whatsapp)/i.test(text);
  }

  private plainText(html: string): string {
    return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&amp;|&quot;|&#39;/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private normalizeText(value: string): string {
    return value.toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-яәіңғүұқөһ0-9]+/gi, ' ').replace(/\s+/g, ' ').trim();
  }

  private similarity(left: string, right: string): number {
    const leftTokens = new Set(this.normalizeText(left).split(' ').filter((token) => token.length > 2));
    const rightTokens = new Set(this.normalizeText(right).split(' ').filter((token) => token.length > 2));
    const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
    return intersection / Math.max(1, new Set([...leftTokens, ...rightTokens]).size);
  }
}
