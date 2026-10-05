import { defineConfig, devices } from '@playwright/test';

// Needs `pnpm db:start` (postgres + object storage). Reuses a running `pnpm dev`.
export default defineConfig({
	testDir: 'e2e',
	testMatch: '**/*.e2e.{ts,js}',
	timeout: 60_000,
	use: {
		baseURL: 'http://localhost:5173',
		...devices['Desktop Chrome'],
		viewport: { width: 1440, height: 900 }
	},
	webServer: {
		command: 'pnpm dev --port 5173 --strictPort',
		port: 5173,
		reuseExistingServer: true,
		timeout: 120_000
	}
});
