import { BlogQualityService } from './blog-quality.service';
import { GeneratedBlogPost, TopicCluster } from './blog-generation.types';

describe('BlogQualityService', () => {
  const service = new BlogQualityService();
  const cluster: TopicCluster = {
    id: 'ai-almaty-order',
    service: 'AI-интеграции',
    category: { ru: 'Технологии', kz: 'Технологиялар' },
    intent: 'заказать',
    city: 'Алматы',
    keywords: ['ai чатбот разработка алматы', 'gpt чатбот разработка алматы'],
    servicePath: 'ai',
  };

  function html(language: 'ru' | 'kz'): string {
    const sentence =
      language === 'ru'
        ? 'Команда сначала описывает процесс, ограничения, источники данных, роли сотрудников и критерии приемки, чтобы решение приносило понятную пользу бизнесу без лишней сложности.'
        : 'Команда алдымен үдерісті, шектеулерді, дереккөздерді, қызметкерлер рөлін және қабылдау талаптарын сипаттайды, сондықтан шешім бизнеске артық күрделіліксіз түсінікті пайда әкеледі.';
    const paragraphs = Array.from({ length: 8 }, () => `<p>${sentence}</p>`).join('');
    return `<h2>Задача бизнеса</h2>${paragraphs}<h2>Выбор решения</h2><ul><li>Анализ</li><li>Проверка</li></ul><h2>Следующий шаг</h2>`;
  }

  function post(): GeneratedBlogPost {
    return {
      slug: 'ai-chatbot-for-business-almaty',
      title: {
        ru: 'AI-чатбот для бизнеса в Алматы',
        en: '',
        kz: 'Алматыдағы бизнеске AI чатбот',
      },
      description: {
        ru: 'Как выбрать AI-чатбот для бизнеса в Алматы: требования, интеграции и этапы запуска.',
        en: '',
        kz: 'Алматыдағы бизнеске AI чатбот таңдау: талаптар, интеграция және іске қосу.',
      },
      excerpt: {
        ru: 'Практическое руководство для компаний, которые оценивают AI-чатбот перед запуском.',
        en: '',
        kz: 'AI чатботты бағалап жүрген компанияларға арналған қысқа нұсқаулық.',
      },
      category: { ru: 'Технологии', en: '', kz: 'Технологиялар' },
      date: '2000-01-01',
      keywords: {
        ru: ['ai чатбот', 'gpt чатбот'],
        en: [],
        kz: ['ai чатбот', 'gpt'],
      },
      readingTime: 99,
      published: false,
      content: { ru: html('ru'), en: '', kz: html('kz') },
    };
  }

  it('repairs and accepts imperfect GPT output', () => {
    const normalized = service.normalize(post(), cluster);
    const report = service.validate(normalized, cluster);
    expect(report.errors).toEqual([]);
    expect(normalized.content.ru).toMatch(/\/ru\/services\/ai/);
    expect(normalized.content.kz).toMatch(/\/kz\/services\/ai/);
    expect(normalized.content.ru).toMatch(/консультац|обсудить|свяжитесь/i);
  });

  it('rejects guarantees and unsafe markup', () => {
    const candidate = service.normalize(post(), cluster);
    candidate.content.ru += '<script>alert(1)</script><p>Гарантируем результат.</p>';
    const report = service.validate(candidate, cluster);
    expect(report.passed).toBe(false);
    expect(report.errors.join(' ')).toMatch(/unsafe HTML|guarantee/);
  });
});
