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
    const sentence = language === 'ru'
      ? 'Команда сначала описывает процесс, ограничения, источники данных, роли сотрудников и критерии приемки, чтобы решение приносило понятную пользу бизнесу без лишней сложности.'
      : 'Команда алдымен үдерісті, шектеулерді, дереккөздерді, қызметкерлер рөлін және қабылдау талаптарын сипаттайды, сондықтан шешім бизнеске артық күрделіліксіз түсінікті пайда әкеледі.';
    const paragraphs = Array.from({ length: 36 }, () => `<p>${sentence}</p>`).join('');
    const cta = language === 'ru'
      ? '<p>Свяжитесь с нами, чтобы обсудить задачу и получить консультацию.</p>'
      : '<p>Міндетті талқылау және кеңес алу үшін бізге хабарласыңыз.</p>';
    return `<h2>Задача бизнеса</h2>${paragraphs}<h2>Выбор решения</h2><ul><li>Анализ</li><li>Проверка</li></ul><h2>Следующий шаг</h2><p><a href="/${language}/services/ai">AI қызметі</a> и <a href="/${language}/services/consulting">консультация</a>.</p>${cta}`;
  }

  function post(): GeneratedBlogPost {
    return {
      slug: 'ai-chatbot-for-business-almaty',
      title: {
        ru: 'AI-чатбот для бизнеса в Алматы: как выбрать решение',
        en: '',
        kz: 'Алматыдағы бизнеске AI чатботты қалай дұрыс таңдау керек',
      },
      description: {
        ru: 'Разбираем, как выбрать AI-чатбот для бизнеса в Алматы: требования, интеграции, риски и этапы запуска. Обсудите задачу на консультации.',
        en: '',
        kz: 'Алматыдағы бизнеске AI чатбот таңдаудың талаптары, интеграциясы, тәуекелі және іске қосу кезеңдері. Міндетті кеңесте талқылаңыз.',
      },
      excerpt: {
        ru: 'Практическое руководство для компаний, которые оценивают AI-чатбот: какие процессы автоматизировать, как подготовить данные и проверить подрядчика перед запуском.',
        en: '',
        kz: 'AI чатботты бағалап жүрген компанияларға арналған нұсқаулық: қандай үдерісті автоматтандыру, деректерді дайындау және мердігерді іске қосуға дейін тексеру жолдары.',
      },
      category: { ru: 'Технологии', en: '', kz: 'Технологиялар' },
      date: new Date().toISOString().slice(0, 10),
      keywords: {
        ru: ['ai чатбот разработка алматы', 'gpt чатбот для бизнеса', 'ai интеграция', 'автоматизация'],
        en: [],
        kz: ['алматы ai чатбот', 'бизнеске ai көмекші', 'ai интеграция', 'автоматтандыру'],
      },
      readingTime: 8,
      published: false,
      content: { ru: html('ru'), en: '', kz: html('kz') },
    };
  }

  it('accepts a useful bilingual post', () => {
    expect(service.validate(post(), cluster).errors).toEqual([]);
  });

  it('normalizes date and readingTime before validation', () => {
    const candidate = post();
    candidate.date = '2000-01-01';
    candidate.readingTime = 99 as number;
    const normalized = service.normalize(candidate, cluster);
    expect(normalized.date).toBe(new Date().toISOString().slice(0, 10));
    expect(normalized.readingTime).toBe(20);
    expect(service.validate(normalized, cluster).passed).toBe(true);
  });

  it('rejects guarantees and unsafe markup', () => {
    const candidate = post();
    candidate.content.ru += '<script>alert(1)</script><p>Гарантируем результат.</p>';
    const report = service.validate(candidate, cluster);
    expect(report.passed).toBe(false);
    expect(report.errors.join(' ')).toMatch(/unsafe HTML|guarantee/);
  });
});
