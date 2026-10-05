/**
 * Web font loading via the Fontsource CDN (Google Fonts + more, no API key).
 * Canvas text only renders a font after it has been loaded, so the renderer
 * subscribes to `onFontLoaded` and redraws affected text.
 */

export interface FontInfo {
	id: string;
	family: string;
	category: string;
	weights: number[];
	styles: string[];
}

const CDN = 'https://cdn.jsdelivr.net/fontsource/fonts';
const LIST_URL = 'https://api.fontsource.org/v1/fonts?subsets=latin';

/** Families that ship with every OS — never fetched. */
const SYSTEM = new Set([
	'Arial',
	'Helvetica',
	'Georgia',
	'Times New Roman',
	'Courier New',
	'Verdana'
]);

const loaded = new Map<string, Promise<boolean>>();
/** Keys of faces that finished loading (document.fonts.check() is true for unknown families, so we track it ourselves). */
const ready = new Set<string>();
const keyOf = (family: string, weight: number, italic: boolean) =>
	`${family}|${weight}|${italic ? 'italic' : 'normal'}`;
const listeners = new Set<(family: string) => void>();

export const fontId = (family: string) => family.toLowerCase().replace(/\s+/g, '-');

export function onFontLoaded(cb: (family: string) => void) {
	listeners.add(cb);
	return () => listeners.delete(cb);
}

export function isFontReady(family: string, weight = 400, italic = false) {
	if (SYSTEM.has(family) || typeof document === 'undefined') return true;
	return ready.has(keyOf(family, weight, italic));
}

export function ensureFont(family: string, weight = 400, italic = false): Promise<boolean> {
	if (SYSTEM.has(family) || typeof document === 'undefined') return Promise.resolve(true);
	const style = italic ? 'italic' : 'normal';
	const key = keyOf(family, weight, italic);
	let p = loaded.get(key);
	if (!p) {
		const url = `${CDN}/${fontId(family)}@latest/latin-${weight}-${style}.woff2`;
		const face = new FontFace(family, `url(${url})`, { weight: String(weight), style });
		p = face
			.load()
			.then((f) => {
				document.fonts.add(f);
				ready.add(key);
				for (const cb of listeners) cb(family);
				return true;
			})
			.catch(async () => {
				// This weight/style doesn't exist for the family; fall back to regular.
				const ok = weight !== 400 || italic ? await ensureFont(family, 400, false) : false;
				ready.add(key); // don't retry (and don't keep re-rendering) a missing face
				return ok;
			});
		loaded.set(key, p);
	}
	return p;
}

let fontList: Promise<FontInfo[]> | undefined;

export function listFonts(): Promise<FontInfo[]> {
	fontList ??= fetch(LIST_URL)
		.then((r) => r.json())
		.then((rows: FontInfo[]) =>
			rows
				.filter((f) => f.weights?.length)
				.map(({ id, family, category, weights, styles }) => ({
					id,
					family,
					category,
					weights,
					styles
				}))
		)
		.catch(() => {
			fontList = undefined;
			return [];
		});
	return fontList;
}

/** Load a font's regular weight just for previewing its name in the picker. */
export function previewFont(family: string) {
	return ensureFont(family, 400, false);
}
