import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
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
    this.model = this.config.get<string>('OPENAI_BLOG_MODEL') || 'gpt-5-mini';
    if (apiKey) this.client = new OpenAI({ apiKey });
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
            'You are a senior bilingual RU/KZ commercial editor for aidardev.kz in Kazakhstan.',
            'Return only the requested structured object. Write original, useful, factual content.',
            'Never invent clients, completed projects, testimonials, measured results, prices, statistics, guarantees, or case studies.',
            'Do not keyword-stuff. Explain options, trade-offs, buying criteria, process, and practical next steps.',
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
    return `
Create one article in Russian and a native Kazakh adaptation (not a literal translation).
Market: Kazakhstan. Service: ${cluster.service}. Location focus: ${cluster.city}.
Commercial search intent: ${cluster.intent}. Optional editorial angle: ${requestedTopic || 'choose a practical buyer-focused angle'}.
SEO phrase pool (select only natural, relevant phrases): ${cluster.keywords.join('; ')}.
Avoid these existing slugs and closely overlapping angles: ${existingSlugs.slice(0, 80).join(', ') || 'none'}.

Requirements for BOTH ru and kz:
- 700-1200 words of substantive HTML, 3-6 h2 sections, useful lists where appropriate.
- Title 35-90 chars; meta description 120-180 chars; excerpt 140-320 chars; 4-10 keywords.
- 2-5 natural internal links using only /ru/services/${cluster.servicePath} in RU and /kz/services/${cluster.servicePath} in KZ.
- End with a clear, low-pressure CTA to discuss the task or request a consultation.
- Mention cities only where relevant; do not force every city into the text.
- No claims presented as AidarDev experience unless supplied here (none are supplied).
- No years, fabricated examples, fake quotes, rankings, guaranteed outcomes, or unsupported numbers.
- Slug is Latin kebab-case, maximum 100 chars. Date is exactly ${today}.
- readingTime is 4-20. Do not include published; publication is controlled by the server.
${correctionErrors.length ? `Fix every quality-gate issue from the prior attempt:\n- ${correctionErrors.join('\n- ')}` : ''}
`.trim();
  }
}
