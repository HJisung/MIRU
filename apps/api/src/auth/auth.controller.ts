import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { SESSION_COOKIE, SESSION_TTL_MS } from './auth.constants.js';
import { AuthUserDto, LoginDto, RegisterDto } from './auth.dto.js';
import { AuthService } from './auth.service.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post('register')
  @ApiCreatedResponse({ type: AuthUserDto })
  async register(
    @Body() input: RegisterDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.auth.register(input, this.context(request));
    this.setSession(reply, result.token, result.expiresAt);
    return result.user;
  }

  @Post('login')
  @HttpCode(200)
  @ApiOkResponse({ type: AuthUserDto })
  async login(
    @Body() input: LoginDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.auth.login(input, this.context(request));
    this.setSession(reply, result.token, result.expiresAt);
    return result.user;
  }

  @Get('session')
  @ApiOkResponse({ type: AuthUserDto })
  async session(@Req() request: FastifyRequest) {
    const user = await this.auth.authenticate(request.cookies[SESSION_COOKIE]);
    if (!user) throw new UnauthorizedException('Authentication required');
    return user;
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    await this.auth.logout(request.cookies[SESSION_COOKIE]);
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
  }

  private setSession(reply: FastifyReply, token: string, expires: Date) {
    reply.setCookie(SESSION_COOKIE, token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_TTL_MS / 1000,
      expires,
    });
  }

  private context(request: FastifyRequest) {
    return {
      userAgent: request.headers['user-agent'],
      ipAddress: request.ip,
    };
  }
}
