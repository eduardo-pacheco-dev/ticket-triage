import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from './user.entity';
import { RateLimitService } from '../common/rate-limit.service';

const LOGIN_MAX_ATTEMPTS_PER_MINUTE = 20;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly rateLimit: RateLimitService,
  ) {}

  async login(username: string, password: string, ip: string) {
    if (!this.rateLimit.check(`login:${ip}`, LOGIN_MAX_ATTEMPTS_PER_MINUTE)) {
      throw new BadRequestException('Muitas tentativas de login. Aguarde um minuto.');
    }
    const user = await this.usersRepository.findOne({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Usuário ou senha inválidos.');
    }
    return {
      access_token: this.signToken(user),
      mustChangePassword: user.mustChangePassword,
      user: { id: user.id, username: user.username },
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (!newPassword || newPassword.length < 6) {
      throw new UnauthorizedException('A nova senha deve ter no mínimo 6 caracteres');
    }
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuário não encontrado.');
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Senha atual incorreta.');

    const nextVersion = user.tokenVersion + 1;
    await this.usersRepository.update(
      { id: user.id },
      {
        passwordHash: await bcrypt.hash(newPassword, 10),
        tokenVersion: nextVersion,
        mustChangePassword: false,
      },
    );
    return { access_token: this.signToken({ ...user, tokenVersion: nextVersion }) };
  }

  // Invalida todos os tokens emitidos até agora para o usuário.
  async logout(userId: string): Promise<void> {
    await this.usersRepository.increment({ id: userId }, 'tokenVersion', 1);
  }

  private signToken(user: User) {
    const payload = { sub: user.id, username: user.username, tv: user.tokenVersion };
    return this.jwtService.sign(payload);
  }
}
