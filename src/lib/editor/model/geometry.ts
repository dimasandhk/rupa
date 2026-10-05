import type { BaseElement } from './types';

export interface Point {
	x: number;
	y: number;
}

export interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

const RAD = Math.PI / 180;

export function rotate(p: Point, deg: number, origin: Point = { x: 0, y: 0 }): Point {
	if (!deg) return { x: p.x, y: p.y };
	const cos = Math.cos(deg * RAD);
	const sin = Math.sin(deg * RAD);
	const dx = p.x - origin.x;
	const dy = p.y - origin.y;
	return { x: origin.x + dx * cos - dy * sin, y: origin.y + dx * sin + dy * cos };
}

/** Corners of an element after rotation around its (x, y) origin. */
export function corners(
	el: Pick<BaseElement, 'x' | 'y' | 'width' | 'height' | 'rotation'>
): Point[] {
	const o = { x: el.x, y: el.y };
	return [
		{ x: el.x, y: el.y },
		{ x: el.x + el.width, y: el.y },
		{ x: el.x + el.width, y: el.y + el.height },
		{ x: el.x, y: el.y + el.height }
	].map((p) => rotate(p, el.rotation, o));
}

export function boundsOfPoints(points: Point[]): Rect {
	let minX = Infinity,
		minY = Infinity,
		maxX = -Infinity,
		maxY = -Infinity;
	for (const p of points) {
		minX = Math.min(minX, p.x);
		minY = Math.min(minY, p.y);
		maxX = Math.max(maxX, p.x);
		maxY = Math.max(maxY, p.y);
	}
	return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Axis-aligned bounding box of a (possibly rotated) element. */
export function elementBounds(
	el: Pick<BaseElement, 'x' | 'y' | 'width' | 'height' | 'rotation'>
): Rect {
	return boundsOfPoints(corners(el));
}

export function unionBounds(rects: Rect[]): Rect {
	return boundsOfPoints(
		rects.flatMap((r) => [
			{ x: r.x, y: r.y },
			{ x: r.x + r.width, y: r.y + r.height }
		])
	);
}

export function center(r: Rect): Point {
	return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

export function intersects(a: Rect, b: Rect): boolean {
	return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
