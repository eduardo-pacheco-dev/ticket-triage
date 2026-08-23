import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { User } from './user.entity';

export interface JwtPayload {
  sub: string;
  username: string;
  tv: number;
}

// Rotas que permanecem acessíveis enquanto a troca de senha é obrigatória.
const MUST_CHANGE_PASSWORD_EXEMPT_PATHS = new Set([
  '/api/auth/change-password',
  '/api/auth/me',
  '/api/auth/logout',
]);

declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtPayload;
  }
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Não autenticado.');
    }

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(header.slice('Bearer '.length));
    } catch {
      throw new UnauthorizedException('Sessão expirada ou inválida.');
    }

    const user = await this.usersRepository.findOne({ where: { id: payload.sub } });
    if (!user || user.tokenVersion !== payload.tv) {
      throw new UnauthorizedException('Sessão expirada ou inválida.');
    }

    if (user.mustChangePassword && !MUST_CHANGE_PASSWORD_EXEMPT_PATHS.has(request.path)) {
      throw new ForbiddenException('Troque a senha antes de continuar.');
    }

    (request as Request & { user?: JwtPayload }).user = payload;
    return true;
  }
}
