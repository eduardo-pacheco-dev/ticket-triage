import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import type { User } from '../auth/user.entity';

function makeUser(overrides: Partial<User> = {}): User {
  const base: User = {
    id: '00000000-0000-4000-8000-000000000001',
    username: 'ana',
    passwordHash: '$2a$10$hashedpassword',
    tokenVersion: 0,
    mustChangePassword: true,
    createdAt: new Date('2026-08-20T10:00:00Z'),
  };
  return Object.assign(base, overrides);
}

function buildService(users: User[] = []) {
  const repo = {
    find: jest.fn(async () => users),
    findOne: jest.fn(async ({ where }: { where: { id?: string; username?: string } }) =>
      users.find((u) => (where.id ? u.id === where.id : u.username === where.username)),
    ),
    create: jest.fn((data: Partial<User>) => makeUser({ id: crypto.randomUUID(), ...data })),
    save: jest.fn(async (user: User) => {
      users.push(user);
      return user;
    }),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const service = new UsersService(repo as never);
  return { service, repo };
}

describe(UsersService.name, () => {
  describe('findAll', () => {
    it('retorna usuários sem expor o hash da senha', async () => {
      const { service } = buildService([makeUser()]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('passwordHash');
      expect(result[0].username).toBe('ana');
    });
  });

  describe('findOne', () => {
    it('lança NotFound quando o usuário não existe', async () => {
      const { service } = buildService();
      await expect(service.findOne('nao-existe')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it('salva com hash de bcrypt e retorna usuário seguro', async () => {
      const { service, repo } = buildService();
      const result = await service.create('bruno', 'senha123');

      expect(result.username).toBe('bruno');
      expect(result).not.toHaveProperty('passwordHash');
      const saved = repo.save.mock.calls[0][0] as User;
      expect(saved.passwordHash).not.toBe('senha123');
      expect(saved.passwordHash.startsWith('$2')).toBe(true);
    });

    it('lança BadRequest quando o username já existe', async () => {
      const { service, repo } = buildService();
      const dup = Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' });
      repo.save.mockRejectedValue(dup);
      await expect(service.create('ana', 'senha123')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('update', () => {
    it('ao trocar a senha, incrementa tokenVersion e exige troca no próximo login', async () => {
      const existing = makeUser({ tokenVersion: 2 });
      const { service, repo } = buildService([existing]);
      repo.update.mockImplementation(async (_where, patch: Partial<User>) => {
        Object.assign(existing, patch);
      });

      const result = await service.update(existing.id, { password: 'novasenha1' });

      expect(result.mustChangePassword).toBe(true);
      expect(existing.tokenVersion).toBe(3);
      const patch = repo.update.mock.calls[0][1] as Partial<User>;
      expect(patch.passwordHash).not.toBe('$2a$10$hashedpassword');
    });

    it('permite desmarcar a troca obrigatória sem alterar a senha', async () => {
      const existing = makeUser({ mustChangePassword: true, tokenVersion: 5 });
      const { service, repo } = buildService([existing]);
      repo.update.mockImplementation(async (_where, patch: Partial<User>) => {
        Object.assign(existing, patch);
      });

      await service.update(existing.id, { mustChangePassword: false });

      const patch = repo.update.mock.calls[0][1] as Partial<User>;
      expect(patch.tokenVersion).toBeUndefined();
      expect(existing.tokenVersion).toBe(5);
      expect(existing.mustChangePassword).toBe(false);
    });
  });

  describe('remove', () => {
    it('bloqueia a exclusão do próprio usuário', async () => {
      const { service } = buildService([makeUser()]);
      await expect(service.remove(makeUser().id, makeUser().id)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('exclui outro usuário existente', async () => {
      const target = makeUser({ id: '00000000-0000-4000-8000-000000000002' });
      const { service, repo } = buildService([target]);
      repo.delete.mockResolvedValue({ affected: 1 });
      await expect(service.remove(target.id, makeUser().id)).resolves.toBeUndefined();
    });

    it('lança NotFound quando o usuário não existe', async () => {
      const { service, repo } = buildService();
      repo.delete.mockResolvedValue({ affected: 0 });
      await expect(service.remove('x', 'y')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
