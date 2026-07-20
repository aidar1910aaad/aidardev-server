import { Injectable } from '@nestjs/common';
import { BLOG_TOPIC_CLUSTERS, HypeTopicCluster } from './blog-keywords.data';
import { ExistingBlogPost, TopicCluster } from './blog-generation.types';

@Injectable()
export class TopicPlannerService {
  plan(existingPosts: ExistingBlogPost[], seed = new Date().toISOString().slice(0, 10)): TopicCluster {
    const existingDocuments = existingPosts.map((post) =>
      this.tokens([post.slug, post.title, post.category, ...post.keywords].join(' ')),
    );

    const ranked = BLOG_TOPIC_CLUSTERS.map((cluster) => {
      const clusterTokens = this.tokens(
        [cluster.service, cluster.city, cluster.intent, cluster.hook, ...cluster.keywords].join(' '),
      );
      const maxOverlap = existingDocuments.length
        ? Math.max(...existingDocuments.map((document) => this.jaccard(clusterTokens, document)))
        : 0;
      const keywordUsed = existingPosts.some((post) =>
        cluster.keywords.some((keyword) =>
          post.keywords.some((used) => this.normalize(used) === this.normalize(keyword)),
        ),
      );
      // Lower score = better. Prefer unused high-hype topics.
      const noveltyPenalty = maxOverlap * 4 + (keywordUsed ? 3 : 0);
      const hypeBonus = cluster.hypeScore / 100;
      return {
        cluster,
        score: noveltyPenalty - hypeBonus,
      };
    }).sort((a, b) => a.score - b.score || b.cluster.hypeScore - a.cluster.hypeScore || a.cluster.id.localeCompare(b.cluster.id));

    // Take the freshest high-hype band, then pick deterministically by seed.
    const topBand = ranked.slice(0, Math.min(5, ranked.length));
    if (!topBand.length) {
      throw new Error('No blog topic clusters configured');
    }

    const chosen = topBand[this.hash(seed) % topBand.length].cluster;
    return this.toTopicCluster(chosen);
  }

  isCannibalizing(cluster: TopicCluster, post: { slug: string; title: string; keywords: string[] }): boolean {
    const planned = this.tokens([cluster.service, cluster.city, ...cluster.keywords].join(' '));
    const generated = this.tokens([post.slug, post.title, ...post.keywords].join(' '));
    return this.jaccard(planned, generated) < 0.12;
  }

  private toTopicCluster(cluster: HypeTopicCluster): TopicCluster {
    return {
      id: cluster.id,
      service: cluster.service,
      category: cluster.category,
      intent: cluster.intent,
      city: cluster.city,
      keywords: cluster.keywords,
      servicePath: cluster.servicePath,
    };
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
