import type { Fill, Gradient } from '../model/types';

export type RGB = [number, number, number];

export const isGradient = (fill: Fill): fill is Gradient =>
	typeof fill === 'object' && fill !== null;

export function parseHex(hex: string): RGB | undefined {
	const m = hex.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
	if (!m) return;
	const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
	return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function toHex([r, g, b]: RGB): string {
	const c = (v: number) =>
		Math.round(Math.max(0, Math.min(255, v)))
			.toString(16)
			.padStart(2, '0');
	return `#${c(r)}${c(g)}${c(b)}`;
}

/** HSL saturation (0..1) — used to favour brand colours over greys. */
export function saturation([r, g, b]: RGB): number {
	const max = Math.max(r, g, b) / 255;
	const min = Math.min(r, g, b) / 255;
	const l = (max + min) / 2;
	if (max === min) return 0;
	return l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
}

/** OKLab, a perceptual space: euclidean distance ≈ how different colours look. */
export function toOklab([r, g, b]: RGB): [number, number, number] {
	const lin = (v: number) => {
		v /= 255;
		return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
	};
	const [lr, lg, lb] = [lin(r), lin(g), lin(b)];
	const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
	const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
	const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
	return [
		0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
	];
}

export function colorDistance(a: RGB, b: RGB): number {
	const [l1, a1, b1] = toOklab(a);
	const [l2, a2, b2] = toOklab(b);
	return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

/** A representative solid colour for a fill (e.g. for swatch borders, outlines). */
export function primaryColor(fill: Fill): string {
	return isGradient(fill) ? (fill.stops[0]?.color ?? '#000000') : fill;
}

export function fillToCss(fill: Fill): string {
	if (!isGradient(fill)) return fill;
	const stops = [...fill.stops]
		.sort((a, b) => a.offset - b.offset)
		.map((s) => `${s.color} ${Math.round(s.offset * 100)}%`)
		.join(', ');
	return fill.type === 'radial'
		? `radial-gradient(circle, ${stops})`
		: `linear-gradient(${fill.angle}deg, ${stops})`;
}

export function sameFill(a: Fill, b: Fill): boolean {
	if (!isGradient(a) || !isGradient(b))
		return !isGradient(a) && !isGradient(b) && a.toLowerCase() === b.toLowerCase();
	return fillToCss(a).toLowerCase() === fillToCss(b).toLowerCase();
}

export function linearGradient(colors: string[], angle = 90): Gradient {
	return {
		type: 'linear',
		angle,
		stops: colors.map((color, i) => ({
			color,
			offset: colors.length === 1 ? 0 : i / (colors.length - 1)
		}))
	};
}

/**
 * Konva gradient attributes for a box of `w` × `h` whose top-left is at
 * `origin` in the shape's local coordinates. Angles follow CSS: 0° points up,
 * 90° points right, so a gradient looks the same in the editor UI and canvas.
 */
export function konvaFill(fill: Fill, w: number, h: number, origin = { x: 0, y: 0 }) {
	if (!isGradient(fill)) return { fill, fillPriority: 'color' };
	const stops = [...fill.stops]
		.sort((a, b) => a.offset - b.offset)
		.flatMap((s) => [s.offset, s.color]);
	const cx = origin.x + w / 2;
	const cy = origin.y + h / 2;
	if (fill.type === 'radial') {
		return {
			fill: undefined,
			fillPriority: 'radial-gradient',
			fillRadialGradientStartPoint: { x: cx, y: cy },
			fillRadialGradientEndPoint: { x: cx, y: cy },
			fillRadialGradientStartRadius: 0,
			fillRadialGradientEndRadius: Math.hypot(w, h) / 2,
			fillRadialGradientColorStops: stops
		};
	}
	const rad = (fill.angle * Math.PI) / 180;
	const dx = Math.sin(rad);
	const dy = -Math.cos(rad);
	// Same gradient-line length CSS uses, so corners get the end colours.
	const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
	return {
		fill: undefined,
		fillPriority: 'linear-gradient',
		fillLinearGradientStartPoint: { x: cx - dx * half, y: cy - dy * half },
		fillLinearGradientEndPoint: { x: cx + dx * half, y: cy + dy * half },
		fillLinearGradientColorStops: stops
	};
}
