import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';
import { createHash, randomBytes } from 'node:crypto';
import { DatabaseService } from '../database/database.service.js';
import { SESSION_TTL_MS } from './auth.constants.js';
import type { LoginDto, RegisterDto } from './auth.dto.js';

const publicUser = {
  id: true,
  email: true,
  handle: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  role: true,
} as const;

export type AuthUser = {
  id: string;
  email: string;
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  role: 'MEMBER' | 'MODERATOR' | 'ADMIN';
};

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async register(input: RegisterDto, context: RequestContext) {
    const passwordHash = await hash(input.password, {
      algorithm: 2,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
    try {
      const user = await this.database.client.user.create({
        data: {
          email: input.email,
          handle: input.handle,
          displayName: input.displayName.trim(),
          passwordHash,
        },
        select: publicUser,
      });
      return { user, ...(await this.createSession(user.id, context)) };
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email or handle is already in use');
      }
      throw error;
    }
  }

  async login(input: LoginDto, context: RequestContext) {
    const user = await this.database.client.user.findUnique({
      where: { email: input.email },
      select: { ...publicUser, passwordHash: true },
    });
    if (
      !user?.passwordHash ||
      !(await verify(user.passwordHash, input.password))
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const safeUser: AuthUser = {
      id: user.id,
      email: user.email,
      handle: user.handle,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      role: user.role,
    };
    return { user: safeUser, ...(await this.createSession(user.id, context)) };
  }

  async authenticate(token?: string): Promise<AuthUser | null> {
    if (!token) return null;
    const session = await this.database.client.session.findUnique({
      where: { tokenHash: tokenHash(token) },
      include: { user: { select: publicUser } },
    });
    if (!session || session.expiresAt <= new Date()) return null;
    return session.user;
  }

  async logout(token?: string) {
    if (token) {
      await this.database.client.session.deleteMany({
        where: { tokenHash: tokenHash(token) },
      });
    }
  }

  private async createSession(userId: string, context: RequestContext) {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await this.database.client.session.create({
      data: {
        userId,
        tokenHash: tokenHash(token),
        expiresAt,
        userAgent: context.userAgent?.slice(0, 512),
        ipAddress: context.ipAddress?.slice(0, 64),
      },
    });
    return { token, expiresAt };
  }
}

export interface RequestContext {
  userAgent?: string;
  ipAddress?: string;
}
