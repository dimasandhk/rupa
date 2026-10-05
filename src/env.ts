import { defineEnvVars } from '@sveltejs/kit/env';

const optional = (value: string | undefined) => value || undefined;

export const variables = defineEnvVars({
	DATABASE_URL: { description: 'The database connection string.' },
	ORIGIN: {
		description: 'The app origin (base URL), e.g. `http://localhost:5173`.'
	},
	BETTER_AUTH_SECRET: {
		description:
			'Secret used to sign tokens. For production use 32 characters generated with high entropy. See [Better Auth installation](https://www.better-auth.com/docs/installation).'
	},
	S3_ENDPOINT: { description: 'S3-compatible endpoint, e.g. `http://localhost:9000` for MinIO.' },
	S3_REGION: { description: 'S3 region.', schema: (v) => v || 'us-east-1' },
	S3_BUCKET: { description: 'Bucket that holds uploads and thumbnails.' },
	S3_ACCESS_KEY: { description: 'S3 access key id.' },
	S3_SECRET_KEY: { description: 'S3 secret access key.' },
	S3_PUBLIC_URL: {
		description:
			'Optional public/CDN base URL for objects. When unset, files are served through the app at `/files/*`.',
		schema: optional
	},
	UNSPLASH_ACCESS_KEY: { description: 'Unsplash API access key (optional).', schema: optional },
	PEXELS_API_KEY: { description: 'Pexels API key (optional).', schema: optional },
	PUBLIC_BG_REMOVAL_PROVIDER: {
		public: true,
		description: '`browser` (in-browser model) or `api` (fal.ai via server).',
		schema: (v) => (v === 'api' ? 'api' : 'browser')
	},
	FAL_KEY: {
		description: 'fal.ai API key, used when the bg removal provider is `api`.',
		schema: optional
	}
});
