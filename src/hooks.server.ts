import type { Handle, ServerInit } from '@sveltejs/kit/hooks';
import { building, dev } from '$app/env';
import { auth } from '#lib/server/auth.ts';
import { db } from '#lib/server/db/index.ts';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

export const init: ServerInit = async () => {
	// Self-hosted deploys apply pending migrations on boot (dev uses `pnpm db:migrate`).
	if (!dev && !building) await migrate(db, { migrationsFolder: 'drizzle' });
};

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = handleBetterAuth;
