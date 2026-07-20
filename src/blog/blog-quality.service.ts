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
  /**
   * Force-fix brittle GPT issues so commercial posts can publish reliably.
   * Critical safety checks still run in validate().
   */
  normalize(post: GeneratedBlogPost, cluster: TopicCluster): GeneratedBlogPost {
    const today = new Date().toISOString().slice(0, 10);
    const readingTime = Number.isFinite(Number(post.readingTime))
      ? Math.min(20, Math.max(4, Math.round(Number(post.readingTime))))
      : 8;

    const normalized: GeneratedBlogPost = {
      ...post,
      slug: this.uniqueSlug(this.normalizeSlug(post.slug, cluster)),
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
        ru: this.normalizeKeywords(post.keywords?.ru, cluster.keywords),
        en: [],
        kz: this.normalizeKeywords(post.keywords?.kz, cluster.keywords),
      },
      content: {
        ru: this.repairContent(post.content?.ru || '', 'ru', cluster),
        en: '',
        kz: this.repairContent(post.content?.kz || '', 'kz', cluster),
      },
      published: Boolean(post.published),
    };

    return this.clampLocalizedFields(normalized, cluster);
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

    for (const language of ['ru', 'kz'] as const) {
      if (!post.title?.[language]?.trim() || !post.description?.[language]?.trim()) {
        errors.push(`${language} title/description is required`);
      }
      const html = post.content?.[language] || '';
      if (!html || html.length < 200) {
        errors.push(`${language}.content is empty or too short`);
      }
      if (/<(script|style|iframe|object|form)\b/i.test(html) || /\son\w+=/i.test(html)) {
        errors.push(`${language}.content contains unsafe HTML`);
      }
      const plainText = this.plainText(html);
      this.validateClaims(errors, plainText, language);
    }

    for (const existing of existingPosts) {
      const similarity = this.similarity(
        [post.title.ru, post.slug, ...(post.keywords?.ru || [])].join(' '),
        [existing.slug, existing.title, ...existing.keywords].join(' '),
      );
      if (similarity >= 0.85) {
        errors.push(`topic cannibalizes existing post "${existing.slug}"`);
        break;
      }
    }

    // cluster is used for repair/normalize; keep signature for callers/tests
    void cluster;
    return { passed: errors.length === 0, errors };
  }

  private clampLocalizedFields(post: GeneratedBlogPost, cluster: TopicCluster): GeneratedBlogPost {
    const fallbackTitleRu = `${cluster.service} в ${cluster.city}: практический гид`;
    const fallbackTitleKz = `${cluster.city}: ${cluster.service} бойынша нұсқаулық`;
    return {
      ...post,
      title: {
        ru: this.clamp(post.title.ru || fallbackTitleRu, 20, 110),
        en: '',
        kz: this.clamp(post.title.kz || fallbackTitleKz, 20, 110),
      },
      description: {
        ru: this.clamp(
          post.description.ru ||
            `Как выбрать ${cluster.service} в ${cluster.city}: критерии, этапы и практические шаги для бизнеса.`,
          80,
          200,
        ),
        en: '',
        kz: this.clamp(
          post.description.kz ||
            `${cluster.city} қаласында ${cluster.service} таңдау: критерийлер, кезеңдер және практикалық қадамдар.`,
          80,
          200,
        ),
      },
      excerpt: {
        ru: this.clamp(
          post.excerpt.ru ||
            post.description.ru ||
            `Практическое руководство по ${cluster.service} для компаний в ${cluster.city}.`,
          80,
          350,
        ),
        en: '',
        kz: this.clamp(
          post.excerpt.kz ||
            post.description.kz ||
            `${cluster.city} бизнесіне арналған ${cluster.service} бойынша нұсқаулық.`,
          80,
          350,
        ),
      },
    };
  }

  private repairContent(html: string, language: 'ru' | 'kz', cluster: TopicCluster): string {
    let content = this.sanitizeHtml(html);
    if (!content) {
      content =
        language === 'ru'
          ? `<h2>Задача</h2><p>Компании в ${cluster.city} часто ищут понятный способ запустить ${cluster.service} без лишней сложности.</p><h2>Как выбрать</h2><p>Сначала зафиксируйте цель, аудиторию, интеграции и критерии приемки.</p><h2>Следующий шаг</h2><p>После этого можно сравнить варианты и понять объём работ.</p>`
          : `<h2>Міндет</h2><p>${cluster.city} қаласындағы компаниялар ${cluster.service} іске қосудың түсінікті жолын іздейді.</p><h2>Қалай таңдау</h2><p>Алдымен мақсатты, аудиторияны, интеграцияларды және қабылдау талаптарын белгілеңіз.</p><h2>Келесі қадам</h2><p>Осыдан кейін нұсқаларды салыстырып, жұмыс көлемін түсінуге болады.</p>`;
    }

    const servicePath = ALLOWED_SERVICE_PATHS.has(cluster.servicePath)
      ? cluster.servicePath
      : 'websites';
    const serviceHref = `/${language}/services/${servicePath}`;
    const consultingHref = `/${language}/services/consulting`;

    // Drop non-service / wrong-language links; keep only allowed internal service links.
    content = content.replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, (full, href, label) => {
      const match = String(href).match(new RegExp(`^/${language}/services/([a-z-]+)/?$`));
      if (match && ALLOWED_SERVICE_PATHS.has(match[1])) return full;
      return String(label || '');
    });

    if (!new RegExp(`href=["']/${language}/services/`).test(content)) {
      content +=
        language === 'ru'
          ? `<p>Подробнее об услуге: <a href="${serviceHref}">${cluster.service}</a>. При необходимости можно также обсудить <a href="${consultingHref}">консультацию</a>.</p>`
          : `<p>Қызмет туралы толығырақ: <a href="${serviceHref}">${cluster.service}</a>. Қажет болса <a href="${consultingHref}">кеңес</a> те алуға болады.</p>`;
    }

    if (!this.hasCallToAction(this.plainText(content), language)) {
      content +=
        language === 'ru'
          ? '<p>Если хотите обсудить задачу, оставьте заявку или свяжитесь с нами для консультации.</p>'
          : '<p>Міндетті талқылау үшін өтінім қалдырыңыз немесе кеңес алу үшін бізбен байланысыңыз.</p>';
    }

    return content.trim();
  }

  private ensureLocalized(value?: { ru?: string; en?: string; kz?: string }) {
    return {
      ru: (value?.ru || '').trim(),
      en: value?.en || '',
      kz: (value?.kz || '').trim(),
    };
  }

  private normalizeKeywords(keywords: string[] | undefined, fallback: string[]): string[] {
    const unique: string[] = [];
    const seen = new Set<string>();
    for (const keyword of [...(keywords || []), ...fallback]) {
      const trimmed = keyword.trim().replace(/\s+/g, ' ');
      const key = this.normalizeText(trimmed);
      if (!trimmed || seen.has(key)) continue;
      seen.add(key);
      unique.push(trimmed);
      if (unique.length >= 8) break;
    }
    while (unique.length < 3) unique.push(`услуга ${unique.length + 1}`);
    return unique;
  }

  private normalizeSlug(slug: string | undefined, cluster: TopicCluster): string {
    const source = (slug || `${cluster.servicePath}-${cluster.city}-${Date.now()}`)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 90);
    return source || `blog-post-${Date.now()}`;
  }

  private uniqueSlug(slug: string): string {
    // Avoid collisions on rapid retries without DB roundtrip here.
    if (slug.length <= 85) return `${slug}-${Date.now().toString(36).slice(-4)}`;
    return `${slug.slice(0, 85)}-${Date.now().toString(36).slice(-4)}`;
  }

  private sanitizeHtml(html: string): string {
    return html
      .replace(/<(script|style|iframe|object|form)[\s\S]*?<\/\1>/gi, '')
      .replace(/<\/?(script|style|iframe|object|form)\b[^>]*>/gi, '')
      .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
      .replace(/<\/?h1\b[^>]*>/gi, '')
      .trim();
  }

  private clamp(value: string, minimum: number, maximum: number): string {
    let text = value.trim().replace(/\s+/g, ' ');
    if (text.length > maximum) return `${text.slice(0, maximum - 1).trim()}…`;
    if (text.length >= minimum) return text;
    const pad = ' Подробности и критерии выбора разобраны в статье.';
    while (text.length < minimum) text += pad;
    return text.slice(0, maximum);
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

  private hasCallToAction(text: string, language: 'ru' | 'kz'): boolean {
    return language === 'ru'
      ? /(обсудить|оставьте заявку|свяжитесь|консультац|напишите|whatsapp)/i.test(text)
      : /(талқыла|өтінім|хабарлас|кеңес|байланыс|whatsapp)/i.test(text);
  }

  private plainText(html: string): string {
    return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&amp;|&quot;|&#39;/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^a-zа-яәіңғүұқөһ0-9]+/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private similarity(left: string, right: string): number {
    const leftTokens = new Set(this.normalizeText(left).split(' ').filter((token) => token.length > 2));
    const rightTokens = new Set(this.normalizeText(right).split(' ').filter((token) => token.length > 2));
    const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
    return intersection / Math.max(1, new Set([...leftTokens, ...rightTokens]).size);
  }
}
