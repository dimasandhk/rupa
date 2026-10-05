import { create } from 'mutative';
import { describe, expect, it } from 'vitest';
import { createDesign, createShape, createText } from '../model/factory';
import { designDataSchema } from '../model/schema';
import type { DesignData, Page } from '../model/types';
import { align, distribute, reorder } from './arrange';
import { group, ungroup } from './group';
import { addPage, deletePage, duplicatePage, movePage } from './pages';
import { resizeDesign } from './scale';

function pageWith(...boxes: [number, number, number, number][]): Page {
	return {
		id: 'p',
		background: { color: '#fff' },
		elements: boxes.map(([x, y, width, height], i) =>
			createShape('rect', { id: `e${i}`, x, y, width, height })
		)
	};
}

/** Run a command the way the editor does: inside a mutative draft. */
function viaDraft(page: Page, fn: (p: Page) => void): Page {
	return create(page, fn);
}

describe('align', () => {
	it('aligns a single element to the page', () => {
		const p = viaDraft(pageWith([10, 10, 100, 50]), (d) =>
			align(d, ['e0'], 'center', { width: 1000, height: 500 })
		);
		expect(p.elements[0].x).toBe(450);
	});

	it('aligns several elements to their combined bounds', () => {
		const p = viaDraft(pageWith([10, 0, 100, 50], [300, 100, 50, 50]), (d) =>
			align(d, ['e0', 'e1'], 'right', { width: 1000, height: 500 })
		);
		expect(p.elements.map((e) => e.x + e.width)).toEqual([350, 350]);
	});

	it('accounts for rotation using the visual bounds', () => {
		const page = pageWith([100, 100, 100, 100]);
		page.elements[0].rotation = 90; // rotates around top-left: visual box spans x 0..100
		const p = viaDraft(page, (d) => align(d, ['e0'], 'left', { width: 1000, height: 500 }));
		expect(p.elements[0].x).toBeCloseTo(100);
	});
});

describe('distribute', () => {
	it('evens out horizontal gaps', () => {
		const p = viaDraft(pageWith([0, 0, 10, 10], [15, 0, 10, 10], [90, 0, 10, 10]), (d) =>
			distribute(d, ['e0', 'e1', 'e2'], 'horizontal')
		);
		expect(p.elements.map((e) => e.x)).toEqual([0, 45, 90]);
	});
});

describe('reorder', () => {
	const ids = (p: Page) => p.elements.map((e) => e.id);
	const base = () => pageWith([0, 0, 1, 1], [0, 0, 1, 1], [0, 0, 1, 1], [0, 0, 1, 1]);

	it('brings to front and sends to back', () => {
		expect(ids(viaDraft(base(), (d) => reorder(d, ['e1'], 'front')))).toEqual([
			'e0',
			'e2',
			'e3',
			'e1'
		]);
		expect(ids(viaDraft(base(), (d) => reorder(d, ['e2'], 'back')))).toEqual([
			'e2',
			'e0',
			'e1',
			'e3'
		]);
	});

	it('steps one position, keeping blocks together', () => {
		expect(ids(viaDraft(base(), (d) => reorder(d, ['e0', 'e1'], 'forward')))).toEqual([
			'e2',
			'e0',
			'e1',
			'e3'
		]);
		expect(ids(viaDraft(base(), (d) => reorder(d, ['e3'], 'backward')))).toEqual([
			'e0',
			'e1',
			'e3',
			'e2'
		]);
	});
});

describe('group / ungroup', () => {
	it('round-trips positions and stacking order', () => {
		const start = pageWith([10, 20, 50, 50], [500, 500, 10, 10], [100, 200, 30, 40]);
		let gid = '';
		const grouped = viaDraft(start, (d) => {
			gid = group(d, ['e0', 'e2'])!;
		});
		expect(grouped.elements.map((e) => e.id)).toEqual(['e1', gid]);
		const g = grouped.elements[1];
		expect(g).toMatchObject({ x: 10, y: 20, width: 120, height: 220 });

		const ungrouped = viaDraft(grouped, (d) => {
			ungroup(d, gid);
		});
		expect(ungrouped.elements.map((e) => [e.id, e.x, e.y])).toEqual([
			['e1', 500, 500],
			['e0', 10, 20],
			['e2', 100, 200]
		]);
	});

	it('bakes group rotation into children', () => {
		const start = pageWith([0, 0, 10, 10], [100, 0, 10, 10]);
		let gid = '';
		const grouped = viaDraft(start, (d) => {
			gid = group(d, ['e0', 'e1'])!;
			d.elements[0].rotation = 90;
		});
		const out = viaDraft(grouped, (d) => {
			ungroup(d, gid);
		});
		const e1 = out.elements.find((e) => e.id === 'e1')!;
		expect(e1.rotation).toBe(90);
		expect(e1.x).toBeCloseTo(0);
		expect(e1.y).toBeCloseTo(100);
	});
});

describe('pages', () => {
	it('adds, duplicates with fresh ids, moves and deletes', () => {
		const d: DesignData = createDesign(100, 100);
		d.pages[0].elements.push(createText({ id: 'same' }));
		addPage(d, 0);
		expect(d.pages).toHaveLength(2);
		duplicatePage(d, 0);
		expect(d.pages[1].elements[0].id).not.toBe('same');
		expect(movePage(d, 0, 2)).toBe(2);
		expect(d.pages[2].elements[0].id).toBe('same');
		deletePage(d, 0);
		deletePage(d, 0);
		expect(deletePage(d, 0)).toBe(0);
		expect(d.pages).toHaveLength(1);
	});
});

describe('resizeDesign', () => {
	it('scales uniformly and centers into the new size', () => {
		const d = createDesign(1000, 1000);
		d.pages[0].elements.push(createText({ x: 0, y: 0, width: 1000, height: 100, fontSize: 40 }));
		resizeDesign(d, 1920, 1080);
		const t = d.pages[0].elements[0];
		expect(t.width).toBeCloseTo(1080);
		expect(t.x).toBeCloseTo(420);
		expect(t.type === 'text' && t.fontSize).toBeCloseTo(43.2);
		expect(designDataSchema.safeParse(d).success).toBe(true);
	});
});
