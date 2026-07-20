import { TopicCluster } from './blog-generation.types';

// Curated from the project's keywords-seo.txt. Keeping this in TypeScript makes
// the production bundle self-contained and avoids runtime filesystem access.
const services = [
  {
    id: 'landing',
    service: 'разработка лендингов',
    category: { ru: 'Веб-разработка', kz: 'Веб-әзірлеу' },
    path: 'websites',
    keywords: ['разработка лендинга', 'создание лендинга', 'лендинг под ключ'],
  },
  {
    id: 'corporate-site',
    service: 'корпоративные сайты',
    category: { ru: 'Веб-разработка', kz: 'Веб-әзірлеу' },
    path: 'websites',
    keywords: ['корпоративный сайт разработка', 'сайт для бизнеса', 'создание сайта под ключ'],
  },
  {
    id: 'ecommerce',
    service: 'интернет-магазины',
    category: { ru: 'Веб-разработка', kz: 'Веб-әзірлеу' },
    path: 'websites',
    keywords: ['интернет магазин разработка', 'онлайн магазин заказать', 'интернет магазин с оплатой'],
  },
  {
    id: 'crm-saas',
    service: 'CRM и SaaS',
    category: { ru: 'Бизнес', kz: 'Бизнес' },
    path: 'websites',
    keywords: ['создание crm системы', 'saas платформа разработка', 'автоматизация бизнес процессов'],
  },
  {
    id: 'telegram',
    service: 'Telegram-боты',
    category: { ru: 'Автоматизация', kz: 'Автоматтандыру' },
    path: 'bots',
    keywords: ['telegram бот разработка', 'телеграм бот для бизнеса', 'telegram бот с интеграциями'],
  },
  {
    id: 'whatsapp',
    service: 'WhatsApp-боты',
    category: { ru: 'Автоматизация', kz: 'Автоматтандыру' },
    path: 'bots',
    keywords: ['whatsapp бот разработка', 'whatsapp business бот', 'whatsapp автоматизация'],
  },
  {
    id: 'ai',
    service: 'AI-интеграции',
    category: { ru: 'Технологии', kz: 'Технологиялар' },
    path: 'ai',
    keywords: ['ai чатбот разработка', 'gpt чатбот разработка', 'ии ассистент для бизнеса'],
  },
  {
    id: 'mobile',
    service: 'мобильные приложения',
    category: { ru: 'Мобильная разработка', kz: 'Мобильді әзірлеу' },
    path: 'mobile',
    keywords: ['разработка мобильного приложения', 'mvp приложение разработка', 'мобильное приложение под ключ'],
  },
  {
    id: 'design',
    service: 'UI/UX дизайн',
    category: { ru: 'Дизайн', kz: 'Дизайн' },
    path: 'design',
    keywords: ['ui ux дизайн', 'дизайн сайта', 'редизайн интерфейса'],
  },
] as const;

const cities = ['Казахстан', 'Алматы', 'Астана', 'Шымкент', 'Караганда', 'Атырау'];
const intents = ['заказать', 'стоимость и выбор подрядчика', 'под ключ'];

export const BLOG_TOPIC_CLUSTERS: TopicCluster[] = services.flatMap((service) =>
  cities.flatMap((city) =>
    intents.map((intent) => ({
      id: `${service.id}-${city.toLowerCase()}-${intent.replace(/\s+/g, '-')}`,
      service: service.service,
      category: service.category,
      intent,
      city,
      keywords: service.keywords.map((keyword) => `${keyword} ${city}`.toLowerCase()),
      servicePath: service.path,
    })),
  ),
);

export const ALLOWED_SERVICE_PATHS = new Set([
  'websites',
  'bots',
  'ai',
  'mobile',
  'design',
  'consulting',
]);
