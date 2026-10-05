import type { Rect } from '../model/geometry';

export interface Guide {
	orientation: 'V' | 'H';
	/** Page coordinate of the line. */
	pos: number;
}

export interface SnapResult {
	dx: number;
	dy: number;
	guides: Guide[];
}

const stops = (r: Rect, axis: 'x' | 'y') =>
	axis === 'x'
		? [r.x, r.x + r.width / 2, r.x + r.width]
		: [r.y, r.y + r.height / 2, r.y + r.height];

/**
 * Find the smallest offset (within `threshold`) that aligns an edge or center
 * of `moving` with the page or another element's edge/center, per axis.
 */
export function snap(
	moving: Rect,
	others: Rect[],
	page: { width: number; height: number },
	threshold: number
): SnapResult {
	const pageRect = { x: 0, y: 0, ...page };
	const targets = [pageRect, ...others];
	const result: SnapResult = { dx: 0, dy: 0, guides: [] };

	for (const axis of ['x', 'y'] as const) {
		const lines = targets.flatMap((t) => stops(t, axis));
		let best: { diff: number; pos: number } | undefined;
		for (const s of stops(moving, axis)) {
			for (const line of lines) {
				const diff = line - s;
				if (Math.abs(diff) <= threshold && (!best || Math.abs(diff) < Math.abs(best.diff))) {
					best = { diff, pos: line };
				}
			}
		}
		if (best) {
			if (axis === 'x') result.dx = best.diff;
			else result.dy = best.diff;
			// Show every guide the snapped box now touches on this axis.
			const snapped = stops(moving, axis).map((s) => s + best!.diff);
			for (const line of new Set(lines)) {
				if (snapped.some((s) => Math.abs(s - line) < 0.5)) {
					result.guides.push({ orientation: axis === 'x' ? 'V' : 'H', pos: line });
				}
			}
		}
	}
	return result;
}
