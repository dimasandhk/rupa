import { describe, expect, it } from 'vitest';
import { Editor } from '../state/editor.svelte';
import { createDesign, createFrame, createImage } from './factory';
import { coverCrop, frameScreen, FRAMES, refitCrop } from './frames';
import { designDataSchema } from './schema';

describe('frame geometry', () => {
	it('cover-crops a landscape photo into a square frame without distortion', () => {
		const c = coverCrop(4000, 2000, 300, 300);
		expect(c).toEqual({ x: 1000, y: 0, width: 2000, height: 2000 });
	});

	it('re-fits a crop to a new frame shape, keeping centre and staying inside the image', () => {
		const square = { x: 1000, y: 0, width: 2000, height: 2000 };
		const wide = refitCrop(square, 4000, 2000, 2);
		expect(wide.width / wide.height).toBeCloseTo(2);
		expect(wide.x + wide.width / 2).toBeCloseTo(2000);
		expect(wide.y).toBeGreaterThanOrEqual(0);
		expect(wide.y + wide.height).toBeLessThanOrEqual(2000);
		// Too wide for the image: shrinks to fit rather than overflowing.
		const panorama = refitCrop(square, 4000, 2000, 10);
		expect(panorama.width).toBeLessThanOrEqual(4000);
		expect(panorama.x).toBeGreaterThanOrEqual(0);
	});

	it('places device frames’ photo inside the screen, shapes fill the box', () => {
		expect(frameScreen({ frame: 'circle', width: 200, height: 200 })).toMatchObject({
			x: 0,
			y: 0,
			width: 200,
			height: 200
		});
		const phone = frameScreen({ frame: 'phone', width: 200, height: 400 });
		expect(phone.x).toBeGreaterThan(0);
		expect(phone.width).toBeLessThan(200);
		expect(phone.radius).toBeGreaterThan(0);
	});

	it('defines a clip or a screen for every frame kind', () => {
		for (const [kind, def] of Object.entries(FRAMES)) {
			expect(def.clip || def.screen || kind === 'letter', kind).toBeTruthy();
		}
	});
});

describe('editor frame actions', () => {
	function editorWithFrameAndPhoto() {
		const data = createDesign(1000, 1000);
		data.pages[0].elements.push(
			createFrame('circle', { id: 'f', x: 100, y: 100, width: 300, height: 300 }),
			createImage('/files/uploads/u/p.jpg', 4000, 2000, { id: 'p', x: 600, y: 600 })
		);
		return new Editor({ id: 'd', title: 'T', data });
	}

	it('fills a frame from a dragged image in one undoable step', () => {
		const ed = editorWithFrameAndPhoto();
		ed.fillFrame(
			'f',
			{ src: '/files/uploads/u/p.jpg', naturalWidth: 4000, naturalHeight: 2000 },
			'p'
		);
		const page = () => ed.activePage.elements;
		expect(page().map((e) => e.id)).toEqual(['f']);
		const frame = page()[0];
		expect(frame.type === 'frame' && frame.image?.crop).toEqual({
			x: 1000,
			y: 0,
			width: 2000,
			height: 2000
		});
		expect(designDataSchema.safeParse(ed.data).success).toBe(true);
		ed.undo();
		expect(page().map((e) => e.id)).toEqual(['f', 'p']);
	});

	it('detaches the photo back into a standalone image', () => {
		const ed = editorWithFrameAndPhoto();
		ed.fillFrame(
			'f',
			{ src: '/files/uploads/u/p.jpg', naturalWidth: 4000, naturalHeight: 2000 },
			'p'
		);
		ed.detachFrameImage('f');
		const [frame, img] = ed.activePage.elements;
		expect(frame.type === 'frame' && frame.image).toBeFalsy();
		expect(img.type).toBe('image');
		expect(ed.selectedIds).toEqual([img.id]);
	});

	it('crop mode works for filled frames only', () => {
		const ed = editorWithFrameAndPhoto();
		ed.startCrop('f');
		expect(ed.cropId).toBeNull();
		ed.fillFrame('f', { src: 'x.jpg', naturalWidth: 10, naturalHeight: 10 });
		ed.startCrop('f');
		expect(ed.cropId).toBe('f');
	});
});
