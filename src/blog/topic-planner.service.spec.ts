import { TopicPlannerService } from './topic-planner.service';

describe('TopicPlannerService', () => {
  const planner = new TopicPlannerService();

  it('returns a deterministic production cluster', () => {
    expect(planner.plan([], '2026-07-20:slot-1')).toEqual(
      planner.plan([], '2026-07-20:slot-1'),
    );
  });

  it('avoids a cluster whose exact keywords were already used', () => {
    const first = planner.plan([], 'fixed');
    const next = planner.plan([
      {
        slug: first.id,
        title: `${first.service} ${first.city}`,
        category: first.category.ru,
        keywords: first.keywords,
      },
    ], 'fixed');

    expect(next.id).not.toBe(first.id);
    expect(next.keywords.some((keyword) => first.keywords.includes(keyword))).toBe(false);
  });
});
