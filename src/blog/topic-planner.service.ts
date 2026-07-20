import { Injectable } from '@nestjs/common';
import { BLOG_TOPIC_CLUSTERS } from './blog-keywords.data';
import { ExistingBlogPost, TopicCluster } from './blog-generation.types';

@Injectable()
export class TopicPlannerService {
  plan(existingPosts: ExistingBlogPost[], seed = new Date().toISOString().slice(0, 10)): TopicCluster {
    const existingDocuments = existingPosts.map((post) =>
      this.tokens([post.slug, post.title, post.category, ...post.keywords].join(' ')),
    );

    const ranked = BLOG_TOPIC_CLUSTERS.map((cluster) => {
      const clusterTokens = this.tokens(
        [cluster.service, cluster.city, cluster.intent, ...cluster.keywords].join(' '),
      );
      const maxOverlap = Math.max(
        0,
        ...existingDocuments.map((document) => this.jaccard(clusterTokens, document)),
      );
      const keywordUsed = existingPosts.some((post) =>
        cluster.keywords.some((keyword) =>
          post.keywords.some((used) => this.normalize(used) === this.normalize(keyword)),
        ),
      );
      return { cluster, score: maxOverlap + (keywordUsed ? 1 : 0) };
    }).sort((a, b) => a.score - b.score || a.cluster.id.localeCompare(b.cluster.id));

    const bestScore = ranked[0]?.score;
    const candidates = ranked.filter((item) => item.score === bestScore);
    if (!candidates.length) {
      throw new Error('No blog topic clusters configured');
    }

    return candidates[this.hash(seed) % candidates.length].cluster;
  }

  isCannibalizing(cluster: TopicCluster, post: { slug: string; title: string; keywords: string[] }): boolean {
    const planned = this.tokens([cluster.service, cluster.city, ...cluster.keywords].join(' '));
    const generated = this.tokens([post.slug, post.title, ...post.keywords].join(' '));
    return this.jaccard(planned, generated) < 0.12;
  }

  private normalize(value: string): string {
    return value.toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-яәіңғүұқөһ0-9]+/gi, ' ').trim();
  }

  private tokens(value: string): Set<string> {
    return new Set(
      this.normalize(value)
        .split(/\s+/)
        .filter((word) => word.length > 2 && !['для', 'под', 'или', 'как', 'the'].includes(word)),
    );
  }

  private jaccard(left: Set<string>, right: Set<string>): number {
    if (!left.size || !right.size) return 0;
    const intersection = [...left].filter((token) => right.has(token)).length;
    return intersection / new Set([...left, ...right]).size;
  }

  private hash(value: string): number {
    return [...value].reduce((hash, char) => ((hash * 31 + char.charCodeAt(0)) >>> 0), 0);
  }
}
