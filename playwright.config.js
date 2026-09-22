const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'tests/reports/html', open: 'never' }],
    ['junit', { outputFile: 'tests/reports/junit.xml' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:3100',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node backend/src/server.js',
    url: 'http://127.0.0.1:3100',
    env: { PORT: '3100', TASKS_DB_PATH: 'backend/db/e2e-tasks.db' },
    reuseExistingServer: false,
    timeout: 15_000,
  },
});
