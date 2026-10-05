import { elementBounds, unionBounds, type Rect } from '../model/geometry';
import type { Element, Page } from '../model/types';

export type Alignment = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';

function pick(page: Page, ids: string[]) {
	const set = new Set(ids);
	return page.elements.filter((e) => set.has(e.id) && !e.locked);
}

function target(rect: Rect, a: Alignment, frame: Rect): { dx: number; dy: number } {
	switch (a) {
		case 'left':
			return { dx: frame.x - rect.x, dy: 0 };
		case 'center':
			return { dx: frame.x + frame.width / 2 - (rect.x + rect.width / 2), dy: 0 };
		case 'right':
			return { dx: frame.x + frame.width - (rect.x + rect.width), dy: 0 };
		case 'top':
			return { dx: 0, dy: frame.y - rect.y };
		case 'middle':
			return { dx: 0, dy: frame.y + frame.height / 2 - (rect.y + rect.height / 2) };
		case 'bottom':
			return { dx: 0, dy: frame.y + frame.height - (rect.y + rect.height) };
	}
}

/**
 * Align elements. A single element aligns to the page; several align to their
 * combined bounds (Canva behaviour).
 */
export function align(
	page: Page,
	ids: string[],
	a: Alignment,
	pageSize: { width: number; height: number }
) {
	const els = pick(page, ids);
	if (!els.length) return;
	const frame: Rect =
		els.length === 1 ? { x: 0, y: 0, ...pageSize } : unionBounds(els.map((e) => elementBounds(e)));
	for (const el of els) {
		const { dx, dy } = target(elementBounds(el), a, frame);
		el.x += dx;
		el.y += dy;
	}
}

/** Space 3+ elements evenly between the outermost two. */
export function distribute(page: Page, ids: string[], axis: 'horizontal' | 'vertical') {
	const els = pick(page, ids);
	if (els.length < 3) return;
	const pos = axis === 'horizontal' ? 'x' : 'y';
	const size = axis === 'horizontal' ? 'width' : 'height';
	const items = els.map((el) => ({ el, b: elementBounds(el) })).sort((a, b) => a.b[pos] - b.b[pos]);
	const first = items[0].b;
	const last = items[items.length - 1].b;
	const total = items.reduce((sum, i) => sum + i.b[size], 0);
	const gap = (last[pos] + last[size] - first[pos] - total) / (items.length - 1);
	let cursor = first[pos];
	for (const { el, b } of items) {
		el[pos] += cursor - b[pos];
		cursor += b[size] + gap;
	}
}

export type ZOrder = 'forward' | 'backward' | 'front' | 'back';

export function reorder(page: Page, ids: string[], op: ZOrder) {
	const set = new Set(ids);
	const els = page.elements;
	if (op === 'front' || op === 'back') {
		const moving = els.filter((e) => set.has(e.id));
		const rest = els.filter((e) => !set.has(e.id));
		page.elements = op === 'front' ? [...rest, ...moving] : [...moving, ...rest];
		return;
	}
	// Step one position, walking from the side we move towards so blocks stay intact.
	if (op === 'forward') {
		for (let i = els.length - 2; i >= 0; i--) {
			if (set.has(els[i].id) && !set.has(els[i + 1].id)) swap(els, i, i + 1);
		}
	} else {
		for (let i = 1; i < els.length; i++) {
			if (set.has(els[i].id) && !set.has(els[i - 1].id)) swap(els, i, i - 1);
		}
	}
}

function swap(arr: Element[], i: number, j: number) {
	const t = arr[i];
	arr[i] = arr[j];
	arr[j] = t;
}
