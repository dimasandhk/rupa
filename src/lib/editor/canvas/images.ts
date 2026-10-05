/** Shared image cache so re-rendering a node never re-downloads its bitmap. */

type Entry = { img: HTMLImageElement; ready: boolean; failed: boolean; waiters: Set<() => void> };

const cache = new Map<string, Entry>();

/**
 * Returns the image if it is already decoded; otherwise starts loading it and
 * calls `onReady` once (and returns undefined).
 */
export function getImage(src: string, onReady?: () => void): HTMLImageElement | undefined {
	let entry = cache.get(src);
	if (!entry) {
		const img = new Image();
		// Needed so exported canvases are not tainted (MinIO/Unsplash send CORS headers).
		if (!src.startsWith('data:') && !src.startsWith('blob:')) img.crossOrigin = 'anonymous';
		entry = { img, ready: false, failed: false, waiters: new Set() };
		const e = entry;
		img.onload = () => {
			e.ready = true;
			e.waiters.forEach((cb) => cb());
			e.waiters.clear();
		};
		img.onerror = () => {
			e.failed = true;
			e.waiters.forEach((cb) => cb());
			e.waiters.clear();
		};
		img.src = src;
		cache.set(src, entry);
	}
	if (entry.ready) return entry.img;
	if (onReady && !entry.failed) entry.waiters.add(onReady);
	return undefined;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const ready = getImage(src, () => {
			const img = getImage(src);
			if (img) resolve(img);
			else reject(new Error(`Failed to load ${src}`));
		});
		if (ready) resolve(ready);
	});
}

/** Wait for a list of sources (used before export so nothing renders blank). */
export async function waitForImages(srcs: Iterable<string>) {
	await Promise.allSettled([...new Set(srcs)].map(loadImage));
}

export function svgToDataUrl(svg: string, color: string) {
	const colored = svg.replaceAll('currentColor', color);
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(colored)}`;
}
