import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { User } from './user.entity';
import type { JwtPayload } from './jwt-auth.guard';

// Deve rodar depois do JwtAuthGuard, que popula request.user.
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    if (!request.user) {
      throw new UnauthorizedException('Não autenticado.');
    }

    const user = await this.usersRepository.findOne({ where: { id: request.user.sub } });
    if (!user || user.role !== 'admin') {
      throw new ForbiddenException('Acesso restrito a administradores.');
    }
    return true;
  }
}
