import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlogApiSecretGuard } from './blog-api-secret.guard';

describe('BlogApiSecretGuard', () => {
  function context(authorization?: string): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization } }),
      }),
    } as ExecutionContext;
  }

  it('allows the configured bearer token', () => {
    const config = { get: jest.fn().mockReturnValue('strong-secret') } as unknown as ConfigService;
    expect(new BlogApiSecretGuard(config).canActivate(context('Bearer strong-secret'))).toBe(true);
  });

  it('rejects a wrong token', () => {
    const config = { get: jest.fn().mockReturnValue('strong-secret') } as unknown as ConfigService;
    expect(() => new BlogApiSecretGuard(config).canActivate(context('Bearer wrong'))).toThrow(
      UnauthorizedException,
    );
  });
});
