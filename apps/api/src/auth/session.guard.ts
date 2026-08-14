import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { SESSION_COOKIE } from './auth.constants.js';
import { AuthService, type AuthUser } from './auth.service.js';

export type AuthenticatedRequest = FastifyRequest & { authUser: AuthUser };

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const user = await this.auth.authenticate(request.cookies[SESSION_COOKIE]);
    if (!user) throw new UnauthorizedException('Authentication required');
    (request as AuthenticatedRequest).authUser = user;
    return true;
  }
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().authUser,
);
