import { error } from '@sveltejs/kit';
import { nanoid } from 'nanoid';
import { db } from './db';
import { asset } from './db/schema';
import { publicUrl, putObject } from './storage';

export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

/** Detect the image type from magic bytes — never trust a client or remote mime type. */
export function sniffImage(b: Uint8Array): { mime: string; ext: string } | undefined {
	if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47)
		return { mime: 'image/png', ext: 'png' };
	if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
	if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return { mime: 'image/gif', ext: 'gif' };
	const riff = String.fromCharCode(...b.slice(0, 4));
	const webp = String.fromCharCode(...b.slice(8, 12));
	if (riff === 'RIFF' && webp === 'WEBP') return { mime: 'image/webp', ext: 'webp' };
}

export type AssetKind = 'upload' | 'bg_removed' | 'stock';

export async function storeImage(
	ownerId: string,
	bytes: Uint8Array,
	kind: AssetKind,
	size: { width: number | null; height: number | null } = { width: null, height: null }
) {
	if (bytes.length > MAX_IMAGE_BYTES) error(413, 'Images can be up to 25 MB');
	const type = sniffImage(bytes);
	if (!type) error(415, 'Only PNG, JPEG, WebP and GIF images are supported');
	const id = nanoid(16);
	const key = `uploads/${ownerId}/${id}.${type.ext}`;
	await putObject(key, bytes, type.mime);
	await db
		.insert(asset)
		.values({ id, ownerId, key, mime: type.mime, size: bytes.length, kind, ...size });
	return { id, url: publicUrl(key), ...size };
}

/** Download a remote image (https only, size-capped) into our storage. */
export async function importRemoteImage(ownerId: string, url: string, kind: AssetKind) {
	const parsed = new URL(url);
	if (parsed.protocol !== 'https:') error(400, 'Only https images can be imported');
	const res = await fetch(parsed, {
		redirect: 'follow',
		headers: { 'user-agent': 'Rupa/0.1 (self-hosted design editor)' },
		signal: AbortSignal.timeout(20_000)
	});
	if (!res.ok || !res.body) error(502, `Could not download the image (${res.status})`);
	const declared = Number(res.headers.get('content-length') ?? 0);
	if (declared > MAX_IMAGE_BYTES) error(413, 'Image is too large');
	const reader = res.body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		total += value.length;
		if (total > MAX_IMAGE_BYTES) {
			await reader.cancel();
			error(413, 'Image is too large');
		}
		chunks.push(value);
	}
	const bytes = new Uint8Array(total);
	let offset = 0;
	for (const c of chunks) {
		bytes.set(c, offset);
		offset += c.length;
	}
	return storeImage(ownerId, bytes, kind);
}
