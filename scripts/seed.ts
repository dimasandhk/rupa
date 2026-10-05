/**
 * Seeds starter templates and (optionally) a local development account.
 *
 *   pnpm db:seed            # templates only
 *   pnpm db:seed --dev-user # also create the dev login below (server must be running)
 */
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { nanoid } from 'nanoid';
import postgres from 'postgres';
import { designDataSchema } from '../src/lib/editor/model/schema';
import { design, user } from '../src/lib/server/db/schema';
import { TEMPLATES } from './templates';

/** Local-only test account for development. Never use these values in production. */
export const DEV_USER = {
	name: 'Dev User',
	email: 'dev@dimva.test',
	password: 'dimva-dev-password'
};

const SYSTEM_USER_ID = 'system-templates';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set (run with --env-file=.env)');
const client = postgres(url, { max: 1 });
const db = drizzle(client);

async function seedTemplates() {
	await db
		.insert(user)
		.values({
			id: SYSTEM_USER_ID,
			name: 'Templates',
			email: 'templates@dimva.local',
			emailVerified: true
		})
		.onConflictDoNothing();
	// Idempotent: replace the starter set on every run.
	await db.delete(design).where(eq(design.ownerId, SYSTEM_USER_ID));
	for (const tpl of TEMPLATES) {
		const data = designDataSchema.parse(tpl.data);
		await db.insert(design).values({
			id: nanoid(14),
			ownerId: SYSTEM_USER_ID,
			title: tpl.title,
			width: data.width,
			height: data.height,
			data,
			isTemplate: true,
			templateCategory: tpl.category
		});
	}
	console.log(`Seeded ${TEMPLATES.length} templates`);
}

async function seedDevUser() {
	const origin = process.env.ORIGIN || 'http://localhost:5173';
	const res = await fetch(`${origin}/api/auth/sign-up/email`, {
		method: 'POST',
		headers: { 'content-type': 'application/json', origin },
		body: JSON.stringify(DEV_USER)
	});
	if (res.ok) console.log(`Created dev user ${DEV_USER.email}`);
	else console.log(`Dev user not created (${res.status}): ${await res.text()}`);
}

try {
	await seedTemplates();
	if (process.argv.includes('--dev-user')) await seedDevUser();
} finally {
	await client.end();
}
