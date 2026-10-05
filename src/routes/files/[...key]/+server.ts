import { error } from '@sveltejs/kit';
import { getObject } from '#lib/server/storage.ts';
import type { RequestHandler } from './$types';

/**
 * Serves stored objects when no public S3/CDN URL is configured. Keys are
 * random, so URLs are unguessable (same model as Canva's media CDN). Only
 * raster images are ever stored, and responses are sandboxed regardless.
 */
export const GET: RequestHandler = async ({ params }) => {
	if (!/^(uploads|thumbnails)\/[\w-]+\/[\w-]+\.(png|jpe?g|webp|gif)$/.test(params.key)) {
		error(404, 'Not found');
	}
	try {
		const obj = await getObject(params.key);
		return new Response(obj.body, {
			headers: {
				'content-type': obj.contentType,
				...(obj.contentLength !== undefined && { 'content-length': String(obj.contentLength) }),
				'cache-control': 'public, max-age=31536000, immutable',
				'x-content-type-options': 'nosniff',
				'content-security-policy': "default-src 'none'; sandbox",
				'access-control-allow-origin': '*'
			}
		});
	} catch {
		error(404, 'Not found');
	}
};
