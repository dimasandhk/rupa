import { error, json } from '@sveltejs/kit';
import { requireUser } from '#lib/server/designs.ts';
import { activeProvider, searchPhotos } from '#lib/server/stock.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	requireUser(event, { api: true });
	const q = event.url.searchParams.get('q')?.trim().slice(0, 100);
	const page = Math.max(1, Math.min(50, Number(event.url.searchParams.get('page')) || 1));
	if (!q) error(400, 'Missing query');
	const photos = await searchPhotos(q, page);
	return json(
		{ provider: activeProvider(), photos },
		{ headers: { 'cache-control': 'private, max-age=300' } }
	);
};
