import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

@Injectable()
export class BlogApiSecretGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const configuredSecret = this.config.get<string>('BLOG_API_SECRET');
    if (!configuredSecret) {
      throw new ServiceUnavailableException('BLOG_API_SECRET is not configured');
    }

    const authorization = context.switchToHttp().getRequest<Request>().headers.authorization;
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token || !this.equals(token, configuredSecret)) {
      throw new UnauthorizedException('Invalid blog bearer token');
    }
    return true;
  }

  private equals(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
  }
}
