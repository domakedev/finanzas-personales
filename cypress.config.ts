import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 720,
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    // Aumentar timeouts para Firebase
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 30000,
  },
  env: {
    // Firebase test credentials (override in cypress.env.json)
    TEST_EMAIL: '',
    TEST_PASSWORD: '',
  },
});
