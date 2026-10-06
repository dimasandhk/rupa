/**
 * Open-source icon library via the Iconify API (https://iconify.design).
 * Iconify aggregates 200+ icon sets; we offer a curated group of permissively
 * licensed ones (MIT, Apache-2.0, ISC, CC0, CC-BY), grouped by style.
 */

const API = 'https://api.iconify.design';

export interface IconSource {
	id: string;
	label: string;
	prefixes: string[];
}

const LINE = [
	'tabler',
	'lucide',
	'ph',
	'iconoir',
	'mingcute',
	'solar',
	'carbon',
	'ri',
	'bi',
	'heroicons',
	'material-symbols'
];
const SOLID = ['mdi', 'ic', 'fa6-solid', 'ion', 'material-symbols', 'ri', 'mingcute', 'bi'];
const COLOR = ['fluent-color', 'flat-color-icons', 'streamline-color', 'streamline-plump-color'];
const EMOJI = [
	'fluent-emoji-flat',
	'fluent-emoji',
	'noto',
	'twemoji',
	'openmoji',
	'emojione',
	'streamline-emojis',
	'fxemoji'
];
const ILLUSTRATED = ['game-icons', 'healthicons'];
const BRANDS = ['logos', 'simple-icons', 'skill-icons', 'devicon', 'cib', 'token-branded'];

export const ICON_SOURCES: IconSource[] = [
	{
		id: 'all',
		label: 'All',
		prefixes: [...new Set([...COLOR, ...EMOJI, ...LINE, ...SOLID, ...ILLUSTRATED, ...BRANDS])]
	},
	{ id: 'line', label: 'Line', prefixes: LINE },
	{ id: 'solid', label: 'Solid', prefixes: SOLID },
	{ id: 'color', label: 'Color', prefixes: COLOR },
	{ id: 'emoji', label: 'Emoji & stickers', prefixes: EMOJI },
	{ id: 'illustrated', label: 'Illustrated', prefixes: ILLUSTRATED },
	{ id: 'brands', label: 'Brands', prefixes: BRANDS }
];

export interface IconSetInfo {
	name: string;
	license: string;
	author?: string;
}

interface IconData {
	width?: number;
	height?: number;
	icons: Record<
		string,
		{ body: string; width?: number; height?: number; left?: number; top?: number }
	>;
	aliases?: Record<string, { parent: string }>;
}

export interface Graphic {
	/** "prefix:name" */
	id: string;
	svg: string;
}

const svgCache = new Map<string, string>();
let setInfo: Promise<Record<string, IconSetInfo>> | undefined;

/** Names and licenses of the curated sets (for attribution tooltips). */
export function iconSetInfo(): Promise<Record<string, IconSetInfo>> {
	const prefixes = ICON_SOURCES[0].prefixes.join(',');
	setInfo ??= fetch(`${API}/collections?prefixes=${prefixes}`)
		.then((r) => r.json())
		.then(
			(
				all: Record<
					string,
					{ name: string; license?: { title?: string; spdx?: string }; author?: { name?: string } }
				>
			) =>
				Object.fromEntries(
					Object.entries(all).map(([p, c]) => [
						p,
						{
							name: c.name,
							license: c.license?.spdx ?? c.license?.title ?? 'Open source',
							author: c.author?.name
						}
					])
				)
		)
		.catch(() => {
			setInfo = undefined;
			return {};
		});
	return setInfo;
}

function toSvg(data: IconData, name: string): string | undefined {
	const icon = data.icons[name] ?? data.icons[data.aliases?.[name]?.parent ?? ''];
	if (!icon) return;
	const w = icon.width ?? data.width ?? 16;
	const h = icon.height ?? data.height ?? 16;
	return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="${icon.left ?? 0} ${icon.top ?? 0} ${w} ${h}">${icon.body}</svg>`;
}

/**
 * Search icons and return them as ready-to-use SVG. Icon bodies are fetched
 * in bulk (one request per icon set, not per icon) and cached, so "load more"
 * only downloads the new ones.
 */
export async function searchIcons(
	query: string,
	source: IconSource,
	limit: number
): Promise<Graphic[]> {
	const res = await fetch(
		`${API}/search?query=${encodeURIComponent(query)}&limit=${limit}&prefixes=${source.prefixes.join(',')}`
	);
	if (!res.ok) throw new Error('The icon library is busy. Try again shortly.');
	const ids: string[] = (await res.json()).icons ?? [];

	const missing = new Map<string, string[]>();
	for (const id of ids) {
		if (svgCache.has(id)) continue;
		const [prefix, name] = id.split(':');
		missing.set(prefix, [...(missing.get(prefix) ?? []), name]);
	}
	await Promise.all(
		[...missing].map(async ([prefix, names]) => {
			const r = await fetch(`${API}/${prefix}.json?icons=${names.join(',')}`);
			if (!r.ok) return;
			const data: IconData = await r.json();
			for (const name of names) {
				const svg = toSvg(data, name);
				if (svg) svgCache.set(`${prefix}:${name}`, svg);
			}
		})
	);
	return ids.flatMap((id) => {
		const svg = svgCache.get(id);
		return svg ? [{ id, svg }] : [];
	});
}

/** Multi-colour sets ignore the colour picker (their SVGs carry their own colours). */
export const isMulticolor = (svg: string) => !svg.includes('currentColor');
