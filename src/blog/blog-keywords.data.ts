import { TopicCluster } from './blog-generation.types';

export type HypeTopicCluster = TopicCluster & {
  hook: string;
  hypeScore: number;
};

/**
 * High-intent, lead-oriented topic pool for Kazakhstan.
 * Prefer money/urgency/AI/automation angles over dry service descriptions.
 */
const hypeTopics: Array<{
  id: string;
  service: string;
  category: { ru: string; kz: string };
  path: string;
  city: string;
  intent: string;
  hook: string;
  hypeScore: number;
  keywords: string[];
}> = [
  // AI / automation hype
  {
    id: 'ai-sales-bot-almaty',
    service: 'AI-чатбот для продаж',
    category: { ru: 'AI и продажи', kz: 'AI және сатылым' },
    path: 'ai',
    city: 'Алматы',
    intent: 'как получать заявки 24/7',
    hook: 'AI-чатбот, который не сливает лиды ночью',
    hypeScore: 98,
    keywords: ['ai чатбот для продаж алматы', 'gpt бот для заявок', 'чатбот на сайт алматы', 'автоответы на сайт'],
  },
  {
    id: 'whatsapp-auto-sales-kz',
    service: 'WhatsApp-автоматизация продаж',
    category: { ru: 'Автоматизация', kz: 'Автоматтандыру' },
    path: 'bots',
    city: 'Казахстан',
    intent: 'закрывать сделки в WhatsApp',
    hook: 'Почему клиенты пишут в WhatsApp, а заявки теряются',
    hypeScore: 97,
    keywords: ['whatsapp бот для бизнеса', 'whatsapp автоматизация продаж', 'whatsapp business бот казахстан', 'бот для заявок whatsapp'],
  },
  {
    id: 'telegram-lead-magnet-astana',
    service: 'Telegram-бот для лидов',
    category: { ru: 'Лидогенерация', kz: 'Лид генерация' },
    path: 'bots',
    city: 'Астана',
    intent: 'собрать базу и заявки',
    hook: 'Telegram-бот вместо менеджера на первой линии',
    hypeScore: 95,
    keywords: ['telegram бот для заявок астана', 'телеграм бот лидогенерация', 'бот для записи клиентов', 'telegram бот для бизнеса'],
  },
  {
    id: 'ai-manager-replace-kz',
    service: 'AI-ассистент для бизнеса',
    category: { ru: 'AI', kz: 'AI' },
    path: 'ai',
    city: 'Казахстан',
    intent: 'снизить нагрузку на менеджеров',
    hook: 'Что можно отдать AI уже сейчас, а что нельзя',
    hypeScore: 94,
    keywords: ['ai ассистент для бизнеса', 'ии для продаж казахстан', 'gpt для компании', 'автоматизация ответов клиентам'],
  },

  // Landing / conversion hype
  {
    id: 'landing-that-sells-almaty',
    service: 'продающий лендинг',
    category: { ru: 'Лидогенерация', kz: 'Лид генерация' },
    path: 'websites',
    city: 'Алматы',
    intent: 'получить заявки с рекламы',
    hook: 'Лендинг, который не сливает бюджет рекламы',
    hypeScore: 96,
    keywords: ['лендинг для рекламы алматы', 'продающий лендинг алматы', 'создание лендинга под ключ', 'лендинг для заявок'],
  },
  {
    id: 'landing-price-trap-kz',
    service: 'лендинг под ключ',
    category: { ru: 'Веб-разработка', kz: 'Веб-әзірлеу' },
    path: 'websites',
    city: 'Казахстан',
    intent: 'не переплатить и не ошибиться',
    hook: 'Дешёвый лендинг vs лендинг, который окупается',
    hypeScore: 92,
    keywords: ['сколько стоит лендинг казахстан', 'лендинг под ключ цена', 'заказать лендинг', 'разработка лендинга'],
  },
  {
    id: 'site-not-bringing-clients',
    service: 'сайт для заявок',
    category: { ru: 'Маркетинг и сайты', kz: 'Маркетинг және сайттар' },
    path: 'websites',
    city: 'Казахстан',
    intent: 'понять почему нет заявок',
    hook: 'Сайт красивый, а заявок нет: 7 причин',
    hypeScore: 96,
    keywords: ['сайт не приносит заявки', 'почему сайт не продаёт', 'как получить заявки с сайта', 'сайт для бизнеса казахстан'],
  },

  // Ecom / money
  {
    id: 'ecommerce-kaspi-almaty',
    service: 'интернет-магазин',
    category: { ru: 'E-commerce', kz: 'E-commerce' },
    path: 'websites',
    city: 'Алматы',
    intent: 'запуск продаж онлайн',
    hook: 'Интернет-магазин в 2026: с чего начать, чтобы не сжечь деньги',
    hypeScore: 93,
    keywords: ['интернет магазин алматы', 'создать онлайн магазин', 'интернет магазин под ключ', 'магазин с оплатой онлайн'],
  },
  {
    id: 'online-payments-trust-kz',
    service: 'онлайн-оплаты на сайте',
    category: { ru: 'E-commerce', kz: 'E-commerce' },
    path: 'websites',
    city: 'Казахстан',
    intent: 'не терять клиентов на оплате',
    hook: 'Почему клиенты бросают корзину перед оплатой',
    hypeScore: 90,
    keywords: ['онлайн оплата на сайте казахстан', 'подключить оплату на сайт', 'интернет магазин оплата', 'конверсия оплаты'],
  },

  // Mobile / MVP
  {
    id: 'mvp-app-fast-kz',
    service: 'MVP мобильного приложения',
    category: { ru: 'Стартапы', kz: 'Стартаптар' },
    path: 'mobile',
    city: 'Казахстан',
    intent: 'быстро проверить идею',
    hook: 'MVP за адекватный бюджет: что реально нужно в первой версии',
    hypeScore: 91,
    keywords: ['mvp приложение разработка', 'мобильное приложение под ключ', 'создать приложение для бизнеса', 'разработка mvp казахстан'],
  },
  {
    id: 'app-or-miniapp-almaty',
    service: 'мобильное приложение или Telegram Mini App',
    category: { ru: 'Мобильная разработка', kz: 'Мобильді әзірлеу' },
    path: 'mobile',
    city: 'Алматы',
    intent: 'выбрать формат запуска',
    hook: 'Приложение, сайт или Telegram Mini App — что быстрее окупится',
    hypeScore: 92,
    keywords: ['telegram mini app разработка', 'мобильное приложение или бот', 'мини апп для бизнеса', 'приложение для клиентов алматы'],
  },

  // Design / conversion UX
  {
    id: 'ux-kills-sales',
    service: 'UI/UX для роста конверсии',
    category: { ru: 'Дизайн и конверсия', kz: 'Дизайн және конверсия' },
    path: 'design',
    city: 'Казахстан',
    intent: 'поднять конверсию без увеличения рекламы',
    hook: 'Реклама дорогая? Сначала почини UX',
    hypeScore: 94,
    keywords: ['ux аудит сайта', 'редизайн для конверсии', 'ui ux дизайн казахстан', 'сайт плохо конвертирует'],
  },
  {
    id: 'redesign-when-needed',
    service: 'редизайн сайта',
    category: { ru: 'Дизайн', kz: 'Дизайн' },
    path: 'design',
    city: 'Алматы',
    intent: 'понять нужен ли редизайн',
    hook: 'Когда редизайн окупается, а когда это пустая трата',
    hypeScore: 88,
    keywords: ['редизайн сайта алматы', 'обновить дизайн сайта', 'ui ux дизайн алматы', 'дизайн сайта для бизнеса'],
  },

  // CRM / ops
  {
    id: 'crm-chaos-sales',
    service: 'CRM и автоматизация продаж',
    category: { ru: 'Автоматизация бизнеса', kz: 'Бизнес автоматтандыру' },
    path: 'websites',
    city: 'Казахстан',
    intent: 'перестать терять лиды в Excel',
    hook: 'Лиды в WhatsApp, Excel и голове менеджера — как собрать в одну систему',
    hypeScore: 93,
    keywords: ['crm для малого бизнеса', 'автоматизация продаж казахстан', 'crm система под ключ', 'учет заявок клиентов'],
  },

  // City commercial demand
  {
    id: 'business-site-astana',
    service: 'сайт для бизнеса',
    category: { ru: 'Веб-разработка', kz: 'Веб-әзірлеу' },
    path: 'websites',
    city: 'Астана',
    intent: 'заказать сайт который приводит клиентов',
    hook: 'Сайт для бизнеса в Астане: что должно быть, чтобы писали сами',
    hypeScore: 89,
    keywords: ['создание сайта астана', 'сайт для бизнеса астана', 'заказать сайт астана', 'корпоративный сайт астана'],
  },
  {
    id: 'landing-shymkent-leads',
    service: 'лендинг для заявок',
    category: { ru: 'Лидогенерация', kz: 'Лид генерация' },
    path: 'websites',
    city: 'Шымкент',
    intent: 'запустить поток заявок',
    hook: 'Как локальному бизнесу в Шымкенте получать заявки с телефона',
    hypeScore: 87,
    keywords: ['лендинг шымкент', 'создание сайта шымкент', 'заявки с сайта шымкент', 'реклама и лендинг'],
  },
  {
    id: 'bots-atyrau-oil-service',
    service: 'боты для сервисного бизнеса',
    category: { ru: 'Автоматизация', kz: 'Автоматтандыру' },
    path: 'bots',
    city: 'Атырау',
    intent: 'принимать заявки без секретаря',
    hook: 'Боты для сервиса в Атырау: запись, статус заказа, напоминания',
    hypeScore: 86,
    keywords: ['telegram бот атырау', 'whatsapp бот для сервиса', 'автоматизация записи клиентов', 'бот для бизнеса атырау'],
  },
  {
    id: 'karaganda-online-sales',
    service: 'онлайн-продажи для бизнеса',
    category: { ru: 'Маркетинг и IT', kz: 'Маркетинг және IT' },
    path: 'consulting',
    city: 'Караганда',
    intent: 'с чего начать продажи через интернет',
    hook: 'С чего начать онлайн-продажи в Караганде без хаоса',
    hypeScore: 85,
    keywords: ['сайт для бизнеса караганда', 'интернет маркетинг караганда', 'заявки онлайн караганда', 'автоматизация продаж'],
  },

  // Hot comparison / decision topics
  {
    id: 'freelancer-vs-studio',
    service: 'выбор подрядчика на разработку',
    category: { ru: 'Выбор подрядчика', kz: 'Мердігер таңдау' },
    path: 'consulting',
    city: 'Казахстан',
    intent: 'не ошибиться с исполнителем',
    hook: 'Фрилансер или студия: где бизнес реально теряет деньги',
    hypeScore: 90,
    keywords: ['как выбрать веб студию', 'фрилансер или студия', 'заказать разработку сайта', 'подрядчик на сайт казахстан'],
  },
  {
    id: 'ai-vs-manager-cost',
    service: 'AI вместо рутины менеджеров',
    category: { ru: 'AI и экономия', kz: 'AI және үнем' },
    path: 'ai',
    city: 'Алматы',
    intent: 'посчитать выгоду автоматизации',
    hook: 'Сколько часов менеджеров съедает рутина — и что отдать боту',
    hypeScore: 95,
    keywords: ['автоматизация менеджеров продаж', 'ai вместо оператора', 'чатбот вместо первой линии', 'экономия на обработке заявок'],
  },
  {
    id: 'ads-without-funnel',
    service: 'воронка после рекламы',
    category: { ru: 'Маркетинг', kz: 'Маркетинг' },
    path: 'websites',
    city: 'Казахстан',
    intent: 'перестать сливать рекламный бюджет',
    hook: 'Реклама есть, продаж нет: дырка между кликом и заявкой',
    hypeScore: 97,
    keywords: ['воронка продаж сайт', 'реклама не приводит клиентов', 'конверсия лендинга', 'заявки с таргета'],
  },
  {
    id: 'speed-trust-seo',
    service: 'быстрый сайт и доверие',
    category: { ru: 'SEO и скорость', kz: 'SEO және жылдамдық' },
    path: 'websites',
    city: 'Казахстан',
    intent: 'не терять клиентов из-за тормозов',
    hook: 'Медленный сайт = потерянные заявки. Что чинить первым',
    hypeScore: 84,
    keywords: ['ускорить сайт', 'сайт долго загружается', 'скорость сайта и заявки', 'технический seo казахстан'],
  },
];

export const BLOG_TOPIC_CLUSTERS: HypeTopicCluster[] = hypeTopics.map((topic) => ({
  id: topic.id,
  service: topic.service,
  category: topic.category,
  intent: topic.intent,
  city: topic.city,
  keywords: topic.keywords,
  servicePath: topic.path,
  hook: topic.hook,
  hypeScore: topic.hypeScore,
}));

export const ALLOWED_SERVICE_PATHS = new Set([
  'websites',
  'bots',
  'ai',
  'mobile',
  'design',
  'consulting',
]);
