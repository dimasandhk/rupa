import { error, json } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import { storeImage } from '#lib/server/assets.ts';
import { db } from '#lib/server/db/index.ts';
import { asset } from '#lib/server/db/schema.ts';
import { requireUser } from '#lib/server/designs.ts';
import { publicUrl } from '#lib/server/storage.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const user = requireUser(event, { api: true });
	const rows = await db
		.select()
		.from(asset)
		.where(and(eq(asset.ownerId, user.id), eq(asset.kind, 'upload')))
		.orderBy(desc(asset.createdAt))
		.limit(200);
	return json(
		rows.map((r) => ({ id: r.id, url: publicUrl(r.key), width: r.width, height: r.height }))
	);
};

export const POST: RequestHandler = async (event) => {
	const user = requireUser(event, { api: true });
	const form = await event.request.formData();
	const file = form.get('file');
	if (!(file instanceof File)) error(400, 'Missing file');
	const dim = (name: string) => {
		const n = Number(form.get(name));
		return Number.isInteger(n) && n > 0 && n < 100_000 ? n : null;
	};
	const kind = form.get('kind') === 'bg_removed' ? 'bg_removed' : 'upload';
	const stored = await storeImage(user.id, new Uint8Array(await file.arrayBuffer()), kind, {
		width: dim('width'),
		height: dim('height')
	});
	return json(stored, { status: 201 });
};
