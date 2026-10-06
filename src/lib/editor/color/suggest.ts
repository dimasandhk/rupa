import { loadImage, svgToDataUrl } from '../canvas/images';
import type { Crop, Element, Gradient, Page } from '../model/types';
import { linearGradient } from './color';
import { pickDistinct, quantize } from './palette';

export interface ColorSource {
	key: string;
	/** Image URL used both for sampling and as the thumbnail. */
	src: string;
	label: string;
	crop?: Crop;
}

export interface SourcePalette extends ColorSource {
	colors: string[];
}

/** Images and graphics on a page (including inside groups), top-most first. */
export function colorSources(page: Page): ColorSource[] {
	const out: ColorSource[] = [];
	const seen = new Set<string>();
	const visit = (els: Element[]) => {
		for (const el of [...els].reverse()) {
			if (el.type === 'group') visit(el.children);
			let source: ColorSource | undefined;
			if (el.type === 'image') {
				const c = el.crop;
				source = {
					key: `${el.src}#${c.x},${c.y},${c.width},${c.height}`,
					src: el.src,
					label: 'Photo',
					crop: c
				};
			} else if (el.type === 'frame' && el.image) {
				const c = el.image.crop;
				source = {
					key: `${el.image.src}#${c.x},${c.y},${c.width},${c.height}`,
					src: el.image.src,
					label: 'Photo',
					crop: c
				};
			} else if (el.type === 'icon') {
				const src = svgToDataUrl(el.svg, el.color);
				source = { key: src, src, label: 'Graphic' };
			}
			if (source && !seen.has(source.key)) {
				seen.add(source.key);
				out.push(source);
			}
		}
	};
	visit(page.elements);
	if (page.background.image) {
		const src = page.background.image.src;
		if (!seen.has(src)) out.push({ key: src, src, label: 'Background' });
	}
	return out;
}

const cache = new Map<string, Promise<string[]>>();
const SAMPLE = 64;

/** Up to 5 representative colours of an image (cached per image + crop). */
export function extractPalette(source: ColorSource): Promise<string[]> {
	let p = cache.get(source.key);
	if (!p) {
		p = (async () => {
			const img = await loadImage(source.src);
			const c = source.crop ?? {
				x: 0,
				y: 0,
				width: img.naturalWidth || 256,
				height: img.naturalHeight || 256
			};
			const scale = Math.min(1, SAMPLE / Math.max(c.width, c.height));
			const w = Math.max(1, Math.round(c.width * scale));
			const h = Math.max(1, Math.round(c.height * scale));
			const canvas = document.createElement('canvas');
			canvas.width = w;
			canvas.height = h;
			const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
			ctx.drawImage(img, c.x, c.y, c.width, c.height, 0, 0, w, h);
			return pickDistinct(quantize(ctx.getImageData(0, 0, w, h).data, 8));
		})().catch(() => []);
		cache.set(source.key, p);
	}
	return p;
}

export async function pagePalettes(page: Page, limit = 6): Promise<SourcePalette[]> {
	const sources = colorSources(page).slice(0, limit);
	const palettes = await Promise.all(
		sources.map(async (s) => ({ ...s, colors: await extractPalette(s) }))
	);
	return palettes.filter((p) => p.colors.length);
}

/**
 * Gradient ideas from the page: each source's two leading colours, then
 * bridges between the lead colours of different sources (e.g. a red logo's
 * red into a green logo's green).
 */
export function suggestGradients(palettes: SourcePalette[], max = 8): Gradient[] {
	const pairs: [string, string][] = [];
	for (const p of palettes) if (p.colors.length >= 2) pairs.push([p.colors[0], p.colors[1]]);
	for (let i = 0; i < palettes.length; i++) {
		for (let j = i + 1; j < palettes.length; j++)
			pairs.push([palettes[i].colors[0], palettes[j].colors[0]]);
	}
	const seen = new Set<string>();
	const out: Gradient[] = [];
	for (const [a, b] of pairs) {
		const key = [a, b].sort().join();
		if (a === b || seen.has(key)) continue;
		seen.add(key);
		out.push(linearGradient([a, b]));
		if (out.length === max) break;
	}
	return out;
}
