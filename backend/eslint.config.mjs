import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      // Nota: `@typescript-eslint/consistent-type-imports` NÃO deve ser ativado aqui.
      // O DI do NestJS depende de `emitDecoratorMetadata`, que ignora imports type-only
      // (ex.: `JwtService` injetado por tipagem no construtor).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  prettierConfig,
);
