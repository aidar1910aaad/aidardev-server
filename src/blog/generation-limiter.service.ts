import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GenerationLimiterService {
  private active = 0;
  private starts: number[] = [];

  constructor(private readonly config: ConfigService) {}

  async run<T>(operation: () => Promise<T>): Promise<T> {
    const concurrency = this.positiveInteger('BLOG_GENERATE_CONCURRENCY', 1);
    const hourlyLimit = this.positiveInteger('BLOG_GENERATE_RATE_PER_HOUR', 6);
    const now = Date.now();
    this.starts = this.starts.filter((startedAt) => startedAt > now - 60 * 60 * 1000);

    if (this.active >= concurrency) {
      throw new HttpException('Blog generation concurrency limit reached', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (this.starts.length >= hourlyLimit) {
      throw new HttpException('Blog generation hourly rate limit reached', HttpStatus.TOO_MANY_REQUESTS);
    }

    this.active += 1;
    this.starts.push(now);
    try {
      return await operation();
    } finally {
      this.active -= 1;
    }
  }

  private positiveInteger(key: string, fallback: number): number {
    const value = Number(this.config.get<string>(key));
    return Number.isInteger(value) && value > 0 ? value : fallback;
  }
}
