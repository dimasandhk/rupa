import { PATHS, POLYGONS } from '../canvas/shapes';
import type { Crop, FrameElement, FrameKind } from './types';

export type FrameGroup = 'Basic shapes' | 'Photo & film' | 'Devices' | 'Letters & numbers';

export interface FrameDef {
	label: string;
	group: FrameGroup;
	/** Default width / height. */
	aspect: number;
	/** Clip path for the photo, in a 100×100 box stretched over the photo area. */
	clip?: string;
	/** Photo area as fractions of the frame box (decorated frames only): [x, y, w, h]. */
	screen?: [number, number, number, number];
	/** Corner radius of the photo area, as a fraction of the frame width. */
	screenRadius?: number;
}

const polygonPath = (pts: number[]) => {
	let d = '';
	for (let i = 0; i < pts.length; i += 2)
		d += `${i ? 'L' : 'M'}${(pts[i] * 100).toFixed(2)} ${(pts[i + 1] * 100).toFixed(2)}`;
	return `${d}Z`;
};

/** Stretch points so they touch all four edges of the unit box, then make a path. */
function normalizedPath(pts: number[]) {
	const xs = pts.filter((_, i) => i % 2 === 0);
	const ys = pts.filter((_, i) => i % 2 === 1);
	const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
	return polygonPath(
		pts.map((v, i) => (i % 2 === 0 ? (v - x0) / (x1 - x0) : (v - y0) / (y1 - y0)))
	);
}

/** Closed path from a polar radius function r(θ). */
function polarPath(r: (t: number) => number, steps = 180) {
	const pts: number[] = [];
	for (let i = 0; i < steps; i++) {
		const t = (i / steps) * Math.PI * 2;
		pts.push(Math.cos(t) * r(t), Math.sin(t) * r(t));
	}
	return normalizedPath(pts);
}

function starPath(points: number, inner: number) {
	const pts: number[] = [];
	for (let i = 0; i < points * 2; i++) {
		const r = i % 2 ? inner : 1;
		const a = -Math.PI / 2 + (i * Math.PI) / points;
		pts.push(Math.cos(a) * r, Math.sin(a) * r);
	}
	return normalizedPath(pts);
}

export const FRAMES: Record<FrameKind, FrameDef> = {
	square: { label: 'Square', group: 'Basic shapes', aspect: 1, clip: 'M0 0H100V100H0Z' },
	rounded: {
		label: 'Rounded',
		group: 'Basic shapes',
		aspect: 1,
		clip: 'M14 0H86A14 14 0 0 1 100 14V86A14 14 0 0 1 86 100H14A14 14 0 0 1 0 86V14A14 14 0 0 1 14 0Z'
	},
	circle: {
		label: 'Circle',
		group: 'Basic shapes',
		aspect: 1,
		clip: 'M50 0A50 50 0 1 1 50 100A50 50 0 1 1 50 0Z'
	},
	arch: {
		label: 'Arch',
		group: 'Basic shapes',
		aspect: 0.8,
		clip: 'M0 100V50A50 50 0 0 1 100 50V100Z'
	},
	triangle: {
		label: 'Triangle',
		group: 'Basic shapes',
		aspect: 1,
		clip: polygonPath(POLYGONS.triangle!)
	},
	diamond: {
		label: 'Diamond',
		group: 'Basic shapes',
		aspect: 1,
		clip: polygonPath(POLYGONS.diamond!)
	},
	hexagon: {
		label: 'Hexagon',
		group: 'Basic shapes',
		aspect: 1.15,
		clip: polygonPath(POLYGONS.hexagon!)
	},
	star: { label: 'Star', group: 'Basic shapes', aspect: 1, clip: polygonPath(POLYGONS.star!) },
	burst: { label: 'Badge', group: 'Basic shapes', aspect: 1, clip: starPath(16, 0.86) },
	heart: { label: 'Heart', group: 'Basic shapes', aspect: 1.05, clip: PATHS.heart },
	arrow: {
		label: 'Arrow',
		group: 'Basic shapes',
		aspect: 1.3,
		clip: polygonPath(POLYGONS['arrow-right']!)
	},
	scallop: {
		label: 'Scallop',
		group: 'Basic shapes',
		aspect: 1,
		clip: polarPath((t) => 0.94 + 0.06 * Math.cos(10 * t), 240)
	},
	blob: {
		label: 'Blob',
		group: 'Basic shapes',
		aspect: 1.1,
		clip: polarPath((t) => 1 + 0.07 * Math.sin(3 * t + 0.6) + 0.04 * Math.cos(5 * t))
	},
	leaf: {
		label: 'Leaf',
		group: 'Basic shapes',
		aspect: 1,
		clip: 'M45 0H100V55A45 45 0 0 1 55 100H0V45A45 45 0 0 1 45 0Z'
	},
	parallelogram: {
		label: 'Slant',
		group: 'Basic shapes',
		aspect: 1.3,
		clip: 'M22 0H100L78 100H0Z'
	},
	polaroid: {
		label: 'Polaroid',
		group: 'Photo & film',
		aspect: 0.84,
		screen: [0.06, 0.05, 0.88, 0.74]
	},
	film: { label: 'Film', group: 'Photo & film', aspect: 1.45, screen: [0.04, 0.17, 0.92, 0.66] },
	phone: {
		label: 'Phone',
		group: 'Devices',
		aspect: 0.49,
		screen: [0.05, 0.024, 0.9, 0.952],
		screenRadius: 0.1
	},
	tablet: {
		label: 'Tablet',
		group: 'Devices',
		aspect: 0.75,
		screen: [0.045, 0.034, 0.91, 0.932],
		screenRadius: 0.025
	},
	laptop: { label: 'Laptop', group: 'Devices', aspect: 1.6, screen: [0.15, 0.07, 0.7, 0.72] },
	browser: {
		label: 'Browser',
		group: 'Devices',
		aspect: 1.45,
		screen: [0, 0.1, 1, 0.9],
		screenRadius: 0.025
	},
	letter: { label: 'Letter', group: 'Letters & numbers', aspect: 0.82 }
};

export interface ScreenRect {
	x: number;
	y: number;
	width: number;
	height: number;
	radius: number;
}

/** Where the photo sits inside a frame, in the frame's local coordinates. */
export function frameScreen(el: Pick<FrameElement, 'frame' | 'width' | 'height'>): ScreenRect {
	const def = FRAMES[el.frame];
	const [fx, fy, fw, fh] = def.screen ?? [0, 0, 1, 1];
	return {
		x: fx * el.width,
		y: fy * el.height,
		width: fw * el.width,
		height: fh * el.height,
		radius: (def.screenRadius ?? 0) * el.width
	};
}

/** Centered crop of a `nw`×`nh` image that covers a `bw`×`bh` box without distortion. */
export function coverCrop(nw: number, nh: number, bw: number, bh: number): Crop {
	const s = Math.max(bw / nw, bh / nh);
	const width = bw / s;
	const height = bh / s;
	return { x: (nw - width) / 2, y: (nh - height) / 2, width, height };
}

/**
 * Re-shape an existing crop to a new aspect ratio (after the frame was
 * resized), keeping its centre and roughly its zoom, inside the image.
 */
export function refitCrop(crop: Crop, nw: number, nh: number, aspect: number): Crop {
	let width = Math.sqrt(crop.width * crop.height * aspect);
	let height = width / aspect;
	const shrink = Math.min(1, nw / width, nh / height);
	// Clamp exactly: rounding must never push the crop outside the image.
	width = Math.min(nw, width * shrink);
	height = Math.min(nh, height * shrink);
	const cx = crop.x + crop.width / 2;
	const cy = crop.y + crop.height / 2;
	const x = Math.min(nw - width, Math.max(0, cx - width / 2));
	const y = Math.min(nh - height, Math.max(0, cy - height / 2));
	return { x, y, width, height };
}

export const FRAME_GROUPS: FrameGroup[] = [
	'Basic shapes',
	'Photo & film',
	'Devices',
	'Letters & numbers'
];
export const FRAME_CHARS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'];
/** Heavy display font used to cut letter/number frames. */
export const LETTER_FONT = 'Archivo Black';
