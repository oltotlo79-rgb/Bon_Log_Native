module.exports = {
  extends: 'expo',
  ignorePatterns: [
    'node_modules/',
    '.expo/',
    'dist/',
    'coverage/',
    'lib/api/generated/',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@supabase/*'],
            message: 'DB に直接アクセスしない。データは /api/v1/* 経由でアクセスすること',
          },
          {
            group: ['prisma', '@prisma/*'],
            message: 'DB に直接アクセスしない。データは /api/v1/* 経由でアクセスすること',
          },
        ],
      },
    ],
  },
};
