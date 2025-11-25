module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/types/**',
    '!src/cli/**',
    '!src/providers/SendGridProvider.ts', // Optional dependency - needs @sendgrid/mail installed
    '!src/providers/SesProvider.ts', // Optional dependency - needs @aws-sdk/client-ses installed
    '!src/providers/MailgunProvider.ts', // Optional dependency - needs mailgun.js + form-data installed
    '!src/providers/ResendProvider.ts', // Optional dependency - needs resend installed
    '!src/providers/PostmarkProvider.ts', // Optional dependency - needs postmark installed
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: true,
  testTimeout: 10000,
};
