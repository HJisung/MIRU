import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthenticatedRequest } from './session.guard.js';

@Injectable()
export class ModeratorGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const user = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>().authUser;
    if (user.role !== 'MODERATOR' && user.role !== 'ADMIN') {
      throw new ForbiddenException('Moderator role required');
    }
    return true;
  }
}
