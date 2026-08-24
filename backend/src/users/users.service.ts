import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { User } from '../auth/user.entity';

export interface SafeUser {
  id: string;
  username: string;
  mustChangePassword: boolean;
  createdAt: Date;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findAll(): Promise<SafeUser[]> {
    const users = await this.usersRepository.find({ order: { username: 'ASC' } });
    return users.map((user) => this.toSafe(user));
  }

  async findOne(id: string): Promise<SafeUser> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return this.toSafe(user);
  }

  async create(username: string, password: string): Promise<SafeUser> {
    try {
      const user = this.usersRepository.create({
        username,
        passwordHash: await bcrypt.hash(password, 10),
      });
      const saved = await this.usersRepository.save(user);
      return this.toSafe(saved);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'ER_DUP_ENTRY') throw new BadRequestException('Este usuário já existe.');
      this.logger.error(`Falha ao criar usuário: ${String(error)}`);
      throw new BadRequestException('Erro ao criar usuário.');
    }
  }

  async update(
    id: string,
    data: { username?: string; password?: string; mustChangePassword?: boolean },
  ): Promise<SafeUser> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    const patch: Partial<User> = {};
    if (data.username !== undefined && data.username !== user.username)
      patch.username = data.username;
    if (data.password !== undefined) {
      patch.passwordHash = await bcrypt.hash(data.password, 10);
      patch.tokenVersion = user.tokenVersion + 1;
      patch.mustChangePassword = data.mustChangePassword ?? true;
    } else if (data.mustChangePassword !== undefined) {
      patch.mustChangePassword = data.mustChangePassword;
    }
    if (Object.keys(patch).length === 0) return this.toSafe(user);

    try {
      await this.usersRepository.update({ id: user.id }, patch);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'ER_DUP_ENTRY') throw new BadRequestException('Este usuário já existe.');
      this.logger.error(`Falha ao atualizar usuário: ${String(error)}`);
      throw new BadRequestException('Erro ao atualizar usuário.');
    }
    return this.toSafe({ ...user, ...patch });
  }

  async remove(id: string, requesterId: string): Promise<void> {
    if (id === requesterId) {
      throw new BadRequestException('Não é possível excluir o próprio usuário.');
    }
    const result = await this.usersRepository.delete(id);
    if (!result.affected) throw new NotFoundException('Usuário não encontrado.');
  }

  private toSafe(user: User): SafeUser {
    return {
      id: user.id,
      username: user.username,
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt,
    };
  }
}
