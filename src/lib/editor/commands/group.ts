import { newId } from '../model/factory';
import { elementBounds, rotate, unionBounds } from '../model/geometry';
import type { GroupElement, Page } from '../model/types';

/** Group elements; returns the new group's id. Children keep their stacking order. */
export function group(page: Page, ids: string[]): string | undefined {
	const set = new Set(ids);
	const members = page.elements.filter((e) => set.has(e.id));
	if (members.length < 2) return;
	const b = unionBounds(members.map((e) => elementBounds(e)));
	const g: GroupElement = {
		id: newId(),
		type: 'group',
		x: b.x,
		y: b.y,
		width: b.width,
		height: b.height,
		rotation: 0,
		opacity: 1,
		locked: false,
		flipX: false,
		flipY: false,
		children: members.map((e) => ({ ...e, x: e.x - b.x, y: e.y - b.y }))
	};
	// The group takes the stacking slot of its top-most member.
	const top = page.elements.findLastIndex((e) => set.has(e.id));
	const result = [];
	for (let i = 0; i < page.elements.length; i++) {
		if (i === top) result.push(g);
		else if (!set.has(page.elements[i].id)) result.push(page.elements[i]);
	}
	page.elements = result;
	return g.id;
}

/** Dissolve a group, baking its transform into the children. Returns child ids. */
export function ungroup(page: Page, id: string): string[] {
	const idx = page.elements.findIndex((e) => e.id === id);
	const g = page.elements[idx];
	if (!g || g.type !== 'group') return [];
	const children = g.children.map((c) => {
		const p = rotate({ x: c.x, y: c.y }, g.rotation);
		return {
			...c,
			x: g.x + p.x,
			y: g.y + p.y,
			rotation: c.rotation + g.rotation,
			opacity: c.opacity * g.opacity
		};
	});
	page.elements.splice(idx, 1, ...children);
	return children.map((c) => c.id);
}
