import type { ShapeKind } from '../model/types';

/** Shapes drawn as a closed polygon, with points in a unit (0..1) box. */
export const POLYGONS: Partial<Record<ShapeKind, number[]>> = {
	triangle: [0.5, 0, 1, 1, 0, 1],
	diamond: [0.5, 0, 1, 0.5, 0.5, 1, 0, 0.5],
	pentagon: regular(5),
	hexagon: [0.25, 0, 0.75, 0, 1, 0.5, 0.75, 1, 0.25, 1, 0, 0.5],
	star: star(5, 0.4),
	'arrow-right': [0, 0.3, 0.6, 0.3, 0.6, 0, 1, 0.5, 0.6, 1, 0.6, 0.7, 0, 0.7]
};

/** Shapes drawn from an SVG path in a 100×100 box. */
export const PATHS: Partial<Record<ShapeKind, string>> = {
	heart:
		'M50 92 C50 92 4 62 4 32 C4 14 18 4 31 4 C41 4 47 10 50 16 C53 10 59 4 69 4 C82 4 96 14 96 32 C96 62 50 92 50 92 Z',
	speech: 'M10 4 H90 Q96 4 96 10 V64 Q96 70 90 70 H40 L20 94 L24 70 H10 Q4 70 4 64 V10 Q4 4 10 4 Z'
};

function regular(n: number): number[] {
	const pts: number[] = [];
	for (let i = 0; i < n; i++) {
		const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
		pts.push(0.5 + 0.5 * Math.cos(a), 0.5 + 0.5 * Math.sin(a));
	}
	return normalize(pts);
}

function star(n: number, inner: number): number[] {
	const pts: number[] = [];
	for (let i = 0; i < n * 2; i++) {
		const r = i % 2 ? inner * 0.5 : 0.5;
		const a = -Math.PI / 2 + (i * Math.PI) / n;
		pts.push(0.5 + r * Math.cos(a), 0.5 + r * Math.sin(a));
	}
	return normalize(pts);
}

/** Stretch points so they touch all four edges of the unit box. */
function normalize(pts: number[]): number[] {
	const xs = pts.filter((_, i) => i % 2 === 0);
	const ys = pts.filter((_, i) => i % 2 === 1);
	const [minX, maxX, minY, maxY] = [
		Math.min(...xs),
		Math.max(...xs),
		Math.min(...ys),
		Math.max(...ys)
	];
	return pts.map((v, i) => (i % 2 === 0 ? (v - minX) / (maxX - minX) : (v - minY) / (maxY - minY)));
}

export const SHAPE_LABELS: Record<ShapeKind, string> = {
	rect: 'Square',
	ellipse: 'Circle',
	triangle: 'Triangle',
	diamond: 'Diamond',
	pentagon: 'Pentagon',
	hexagon: 'Hexagon',
	star: 'Star',
	'arrow-right': 'Arrow',
	heart: 'Heart',
	speech: 'Speech bubble'
};
