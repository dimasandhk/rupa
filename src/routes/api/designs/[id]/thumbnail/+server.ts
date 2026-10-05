import { error } from '@sveltejs/kit';
import { nanoid } from 'nanoid';
import { getDesign, requireUser, setThumbnail } from '#lib/server/designs.ts';
import { putObject, publicUrl } from '#lib/server/storage.ts';
import type { RequestHandler } from './$types';

const MAX = 2 * 1024 * 1024;

/** Body: a small JPEG rendered client-side from page 1. */
export const PUT: RequestHandler = async (event) => {
	const user = requireUser(event, { api: true });
	const d = await getDesign(event.params.id, user.id);
	if (d.ownerId !== user.id) error(403, 'Not your design');
	const bytes = new Uint8Array(await event.request.arrayBuffer());
	if (!bytes.length || bytes.length > MAX) error(413, 'Thumbnail too large');
	if (bytes[0] !== 0xff || bytes[1] !== 0xd8) error(415, 'Thumbnail must be a JPEG');
	// New key per save so caches never serve a stale preview.
	const key = `thumbnails/${d.id}/${nanoid(8)}.jpg`;
	await putObject(key, bytes, 'image/jpeg');
	await setThumbnail(d.id, user.id, key);
	return new Response(JSON.stringify({ url: publicUrl(key) }), {
		headers: { 'content-type': 'application/json' }
	});
};
