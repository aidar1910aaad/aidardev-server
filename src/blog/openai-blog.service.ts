import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { BLOG_TOPIC_CLUSTERS } from './blog-keywords.data';
import { GeneratedBlogPost, TopicCluster } from './blog-generation.types';

const localizedTextSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ru', 'kz'],
  properties: { ru: { type: 'string' }, kz: { type: 'string' } },
} as const;

const localizedKeywordsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ru', 'kz'],
  properties: {
    ru: { type: 'array', minItems: 4, maxItems: 10, items: { type: 'string' } },
    kz: { type: 'array', minItems: 4, maxItems: 10, items: { type: 'string' } },
  },
} as const;

@Injectable()
export class OpenAiBlogService {
  private readonly client?: OpenAI;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    this.model = this.config.get<string>('OPENAI_BLOG_MODEL') || 'gpt-4o-mini';
    if (apiKey) this.client = new OpenAI({ apiKey, timeout: 90_000 });
  }

  async generate(
    cluster: TopicCluster,
    existingSlugs: string[],
    requestedTopic?: string,
    correctionErrors: string[] = [],
  ): Promise<GeneratedBlogPost> {
    if (!this.client) {
      throw new ServiceUnavailableException('OPENAI_API_KEY is not configured');
    }

    const completion = await this.client.chat.completions.create({
      model: this.model,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'bilingual_blog_post',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: [
              'slug',
              'title',
              'description',
              'excerpt',
              'category',
              'date',
              'keywords',
              'readingTime',
              'content',
            ],
            properties: {
              slug: { type: 'string' },
              title: localizedTextSchema,
              description: localizedTextSchema,
              excerpt: localizedTextSchema,
              category: localizedTextSchema,
              date: { type: 'string' },
              keywords: localizedKeywordsSchema,
              readingTime: { type: 'integer' },
              content: localizedTextSchema,
            },
          },
        },
      },
      messages: [
        {
          role: 'system',
          content: [
            'You are a senior bilingual RU/KZ growth editor for aidardev.kz in Kazakhstan.',
            'Write high-intent commercial articles that attract owners and decision-makers who are ready to contact a developer.',
            'Style: punchy, clear, modern, slightly provocative but honest. No fluff.',
            'Never invent clients, completed projects, testimonials, measured results, prices, statistics, guarantees, or case studies.',
            'Do not keyword-stuff. Focus on pain, money lost, time lost, decision criteria, and a concrete next step.',
            'HTML may only use h2,h3,p,ul,ol,li,strong,em,a. No h1, scripts, styles, tables, images, or external links.',
          ].join(' '),
        },
        {
          role: 'user',
          content: this.buildPrompt(cluster, existingSlugs, requestedTopic, correctionErrors),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error('OpenAI returned an empty blog response');
    const parsed = JSON.parse(raw) as Omit<GeneratedBlogPost, 'published'>;

    return {
      ...parsed,
      title: { ...parsed.title, en: '' },
      description: { ...parsed.description, en: '' },
      excerpt: { ...parsed.excerpt, en: '' },
      category: { ...parsed.category, en: '' },
      keywords: { ...parsed.keywords, en: [] },
      content: { ...parsed.content, en: '' },
      published: false,
    };
  }

  private buildPrompt(
    cluster: TopicCluster,
    existingSlugs: string[],
    requestedTopic?: string,
    correctionErrors: string[] = [],
  ): string {
    const today = new Date().toISOString().slice(0, 10);
    const enriched = BLOG_TOPIC_CLUSTERS.find((item) => item.id === cluster.id);
    const hook = enriched?.hook || cluster.intent;

    return `
Create one high-converting article in Russian and a native Kazakh adaptation (not a literal translation).
Market: Kazakhstan. Service angle: ${cluster.service}. Location focus: ${cluster.city}.
Reader intent: ${cluster.intent}.
Must-use editorial hook: "${hook}".
Optional extra angle: ${requestedTopic || 'keep the hook as the main spine'}.
SEO phrase pool (use naturally, 1-2 times each max): ${cluster.keywords.join('; ')}.
Avoid these existing slugs and overlapping angles: ${existingSlugs.slice(0, 80).join(', ') || 'none'}.

Title formula:
- Curiosity + pain + local/business relevance.
- Tone examples: "Почему ...", "Сколько стоит ошибка ...", "Что выбрать ...", "Как перестать терять ...".
- No clickbait lies. No fake numbers. No guarantees.

Content goals for BOTH ru and kz:
- Open with the pain in first 2 paragraphs (lost leads, expensive ads, slow replies, chaos in WhatsApp/Excel).
- Give a practical checklist and decision framework.
- Include a short "who this is for / who this is not for" section.
- Push toward contacting for a consultation without pressure.
- 500-1100 words HTML, 3-6 h2 sections, lists where useful.
- Title 25-100 chars; meta description 100-200 chars; excerpt 100-350 chars; 4-8 keywords.
- Exactly 2 internal links in each language body:
  1) primary service page /{lang}/services/${cluster.servicePath}
  2) secondary: /{lang}/pricing OR a closely related /{lang}/services/* page from the same funnel
- Link anchor text must be natural (not "click here"); mention the service benefit.
- End CTA: RU "обсудить"/"консультация"; KZ "талқылау"/"кеңес"/"байланысу".
- Slug Latin kebab-case <= 100. Date exactly ${today}. readingTime 4-20.
- Do not include published.
${correctionErrors.length ? `Fix every quality-gate issue from the prior attempt:\n- ${correctionErrors.join('\n- ')}` : ''}
`.trim();
  }
}
