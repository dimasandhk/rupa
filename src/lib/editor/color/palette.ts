import { colorDistance, saturation, toHex, toOklab, type RGB } from './color';

export interface Swatch {
	color: string;
	/** Share of sampled pixels in this cluster (0..1). */
	weight: number;
}

/**
 * Group RGBA pixels into `k` colour clusters (k-means with deterministic
 * farthest-point seeding, so the same image always gives the same palette).
 * Transparent pixels are ignored — logos on transparent backgrounds give their
 * ink colours, not the background.
 */
export function quantize(pixels: Uint8ClampedArray, k = 8, iterations = 8): Swatch[] {
	const pts: RGB[] = [];
	for (let i = 0; i < pixels.length; i += 4) {
		if (pixels[i + 3] < 128) continue;
		pts.push([pixels[i], pixels[i + 1], pixels[i + 2]]);
	}
	if (!pts.length) return [];

	const sq = (a: RGB, b: RGB) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
	const centers: RGB[] = [pts[0]];
	const nearest = pts.map((p) => sq(p, pts[0]));
	while (centers.length < Math.min(k, pts.length)) {
		let best = 0;
		for (let i = 1; i < pts.length; i++) if (nearest[i] > nearest[best]) best = i;
		if (nearest[best] === 0) break; // fewer distinct colours than k
		centers.push(pts[best]);
		for (let i = 0; i < pts.length; i++) nearest[i] = Math.min(nearest[i], sq(pts[i], pts[best]));
	}

	const assign = new Array<number>(pts.length).fill(0);
	for (let it = 0; it < iterations; it++) {
		for (let i = 0; i < pts.length; i++) {
			let bi = 0;
			let bd = Infinity;
			for (let c = 0; c < centers.length; c++) {
				const d = sq(pts[i], centers[c]);
				if (d < bd) {
					bd = d;
					bi = c;
				}
			}
			assign[i] = bi;
		}
		const sums = centers.map(() => [0, 0, 0, 0]);
		for (let i = 0; i < pts.length; i++) {
			const s = sums[assign[i]];
			s[0] += pts[i][0];
			s[1] += pts[i][1];
			s[2] += pts[i][2];
			s[3]++;
		}
		for (let c = 0; c < centers.length; c++) {
			const s = sums[c];
			if (s[3]) centers[c] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]];
		}
	}

	const counts = centers.map(() => 0);
	for (const a of assign) counts[a]++;
	return centers
		.map((c, i) => ({ color: toHex(c), rgb: c, weight: counts[i] / pts.length }))
		.filter((s) => s.weight > 0)
		.sort((a, b) => b.weight - a.weight)
		.map(({ color, weight }) => ({ color, weight }));
}

/** Distance (OKLab) from `c` to the segment between `a` and `b`. */
function distanceToSegment(c: RGB, a: RGB, b: RGB): number {
	const [p, q, r] = [toOklab(c), toOklab(a), toOklab(b)];
	const ab = q.map((v, i) => r[i] - v);
	const ap = q.map((v, i) => p[i] - v);
	const len = ab.reduce((s, v) => s + v * v, 0);
	const t = len ? Math.max(0, Math.min(1, ap.reduce((s, v, i) => s + v * ab[i], 0) / len)) : 0;
	return Math.hypot(...p.map((v, i) => v - (q[i] + ab[i] * t)));
}

/**
 * Choose up to `n` visibly different colours, ranking vivid colours above
 * large areas of grey/white so a red logo suggests red rather than its
 * white margin. Neutrals still appear when they are a big part of the image.
 */
export function pickDistinct(swatches: Swatch[], n = 5, minDistance = 0.08): string[] {
	const rgb = (hex: string): RGB => [
		parseInt(hex.slice(1, 3), 16),
		parseInt(hex.slice(3, 5), 16),
		parseInt(hex.slice(5, 7), 16)
	];
	const ranked = swatches
		.filter((s) => s.weight >= 0.01)
		.map((s) => ({
			...s,
			rgb: rgb(s.color),
			score: Math.sqrt(s.weight) * (0.35 + saturation(rgb(s.color)))
		}))
		.sort((a, b) => b.score - a.score);
	const picked: typeof ranked = [];
	// Anti-aliased edges create small clusters that are just a mix of two
	// stronger colours (pink between red ink and a white badge). Skip those.
	const isBlend = (s: (typeof ranked)[number]) =>
		s.weight < 0.15 &&
		picked.some((a, i) =>
			picked.slice(i + 1).some((b) => distanceToSegment(s.rgb, a.rgb, b.rgb) < 0.035)
		);
	for (const s of ranked) {
		if (picked.every((p) => colorDistance(p.rgb, s.rgb) >= minDistance) && !isBlend(s))
			picked.push(s);
		if (picked.length === n) break;
	}
	return picked.map((p) => p.color);
}
