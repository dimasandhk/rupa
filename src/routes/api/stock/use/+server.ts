import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { importRemoteImage } from '#lib/server/assets.ts';
import { requireUser } from '#lib/server/designs.ts';
import { resolveSourceUrl, trackUnsplashDownload } from '#lib/server/stock.ts';
import type { RequestHandler } from './$types';

const body = z.object({
	provider: z.enum(['unsplash', 'pexels', 'wikimedia']),
	id: z.string().max(64)
});

/**
 * Called when a stock photo is placed in a design. Unsplash photos are
 * hotlinked (their guidelines require it) and we only report the download;
 * others are copied into our storage so canvases can be exported (CORS).
 */
export const POST: RequestHandler = async (event) => {
	const user = requireUser(event, { api: true });
	const parsed = body.safeParse(await event.request.json());
	if (!parsed.success) error(400, 'Invalid request');
	const { provider, id } = parsed.data;
	if (provider === 'unsplash') {
		await trackUnsplashDownload(id);
		return json({ url: null });
	}
	const src = await resolveSourceUrl(provider, id);
	const stored = await importRemoteImage(user.id, src, 'stock');
	return json({ url: stored.url });
};
