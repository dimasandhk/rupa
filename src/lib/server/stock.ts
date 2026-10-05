import { error } from '@sveltejs/kit';
import { PEXELS_API_KEY, UNSPLASH_ACCESS_KEY } from '$app/env/private';

export type Provider = 'unsplash' | 'pexels' | 'wikimedia';

export interface StockPhoto {
	id: string;
	provider: Provider;
	thumb: string;
	width: number;
	height: number;
	author: string;
	authorUrl: string;
	/** Present for providers whose images may be hotlinked (Unsplash requires it). */
	url?: string;
}

/** The best configured provider. Wikimedia Commons (freely licensed) needs no key. */
export function activeProvider(): Provider {
	if (UNSPLASH_ACCESS_KEY) return 'unsplash';
	if (PEXELS_API_KEY) return 'pexels';
	return 'wikimedia';
}

// Wikimedia's API policy asks for an identifying User-Agent.
const USER_AGENT = 'Dimva/0.1 (self-hosted design editor)';
const COMMONS =
	'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiextmetadatafilter=Artist';

async function getJson(url: string, headers: Record<string, string> = {}) {
	const res = await fetch(url, {
		headers: { accept: 'application/json', 'user-agent': USER_AGENT, ...headers }
	});
	if (!res.ok) error(502, `Photo provider error (${res.status})`);
	return res.json();
}

const UTM = 'utm_source=dimva&utm_medium=referral';

// Just the fields we read from each provider's API.
interface UnsplashPhoto {
	id: string;
	width: number;
	height: number;
	urls: { small: string; regular: string };
	user: { name: string; links: { html: string } };
}
interface PexelsPhoto {
	id: number;
	width: number;
	height: number;
	src: { medium: string; large2x: string };
	photographer: string;
	photographer_url: string;
}
interface CommonsPage {
	pageid: number;
	index: number;
	imageinfo?: {
		mime: string;
		width: number;
		height: number;
		thumburl: string;
		url: string;
		descriptionurl: string;
		extmetadata?: { Artist?: { value?: string } };
	}[];
}

export async function searchPhotos(q: string, page: number): Promise<StockPhoto[]> {
	const provider = activeProvider();
	const query = encodeURIComponent(q);
	if (provider === 'unsplash') {
		const body = await getJson(
			`https://api.unsplash.com/search/photos?query=${query}&page=${page}&per_page=30`,
			{ authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` }
		);
		return (body.results as UnsplashPhoto[]).map((p) => ({
			id: p.id,
			provider,
			thumb: p.urls.small,
			url: p.urls.regular,
			width: p.width,
			height: p.height,
			author: p.user.name,
			authorUrl: `${p.user.links.html}?${UTM}`
		}));
	}
	if (provider === 'pexels') {
		const body = await getJson(
			`https://api.pexels.com/v1/search?query=${query}&page=${page}&per_page=30`,
			{
				authorization: PEXELS_API_KEY!
			}
		);
		return (body.photos as PexelsPhoto[]).map((p) => ({
			id: String(p.id),
			provider,
			thumb: p.src.medium,
			width: p.width,
			height: p.height,
			author: p.photographer,
			authorUrl: p.photographer_url
		}));
	}
	const offset = (page - 1) * 30;
	const body = await getJson(
		`${COMMONS}&iiurlwidth=400&generator=search&gsrnamespace=6&gsrlimit=30&gsroffset=${offset}&gsrsearch=${query}%20filetype:bitmap`
	);
	const pages = Object.values(body.query?.pages ?? {}) as CommonsPage[];
	return pages
		.sort((a, b) => a.index - b.index)
		.flatMap((p) => {
			const info = p.imageinfo?.[0];
			if (!info || !/^image\/(jpeg|png|webp)$/.test(info.mime) || info.width <= 200) return [];
			return {
				id: String(p.pageid),
				provider,
				thumb: info.thumburl,
				width: info.width,
				height: info.height,
				author: stripTags(info.extmetadata?.Artist?.value) || 'Wikimedia Commons',
				authorUrl: info.descriptionurl
			};
		});
}

const stripTags = (html?: string) =>
	(html ?? '')
		.replace(/<[^>]*>/g, '')
		.trim()
		.slice(0, 80);

/** Unsplash API guidelines: report a download whenever a photo is used. */
export async function trackUnsplashDownload(id: string) {
	if (!UNSPLASH_ACCESS_KEY) return;
	await fetch(`https://api.unsplash.com/photos/${encodeURIComponent(id)}/download`, {
		headers: { authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` }
	}).catch(() => {});
}

/**
 * Resolve the full-size source URL for a photo by asking the provider's API.
 * The client only sends an id, so the server never fetches arbitrary URLs.
 */
export async function resolveSourceUrl(provider: Provider, id: string): Promise<string> {
	if (!/^[\w-]{1,64}$/.test(id)) error(400, 'Invalid photo id');
	if (provider === 'pexels' && PEXELS_API_KEY) {
		const p = await getJson(`https://api.pexels.com/v1/photos/${id}`, {
			authorization: PEXELS_API_KEY
		});
		return p.src.large2x;
	}
	if (provider === 'wikimedia' && /^\d+$/.test(id)) {
		// A 1920px rendition (one of Commons' standard thumbnail steps; other widths return the original).
		const body = await getJson(`${COMMONS}&iiurlwidth=1920&pageids=${id}`);
		const info = body.query?.pages?.[id]?.imageinfo?.[0];
		if (!info) error(404, 'Photo not found');
		return info.thumburl ?? info.url;
	}
	error(400, 'Unsupported provider');
}
