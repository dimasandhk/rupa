import { error, json } from '@sveltejs/kit';
import { FAL_KEY } from '$app/env/private';
import { importRemoteImage, MAX_IMAGE_BYTES, sniffImage } from '#lib/server/assets.ts';
import { requireUser } from '#lib/server/designs.ts';
import type { RequestHandler } from './$types';

/**
 * Background removal through fal.ai's BiRefNet model. Only used when
 * PUBLIC_BG_REMOVAL_PROVIDER=api; the default runs in the browser.
 */
export const POST: RequestHandler = async (event) => {
	const user = requireUser(event, { api: true });
	if (!FAL_KEY) error(501, 'FAL_KEY is not configured on the server');

	const file = (await event.request.formData()).get('file');
	if (!(file instanceof File)) error(400, 'Missing image');
	if (file.size > MAX_IMAGE_BYTES) error(413, 'Image is too large');
	const bytes = new Uint8Array(await file.arrayBuffer());
	const type = sniffImage(bytes);
	if (!type) error(415, 'Unsupported image type');

	const res = await fetch('https://fal.run/fal-ai/birefnet/v2', {
		method: 'POST',
		headers: { authorization: `Key ${FAL_KEY}`, 'content-type': 'application/json' },
		body: JSON.stringify({
			image_url: `data:${type.mime};base64,${Buffer.from(bytes).toString('base64')}`,
			model: 'General Use (Light)',
			output_format: 'png'
		}),
		signal: AbortSignal.timeout(90_000)
	});
	if (!res.ok) error(502, `Background removal service failed (${res.status})`);
	const body = await res.json();
	const url: string | undefined = body?.image?.url;
	if (!url) error(502, 'Background removal service returned no image');

	const stored = await importRemoteImage(user.id, url, 'bg_removed');
	return json({ url: stored.url });
};
