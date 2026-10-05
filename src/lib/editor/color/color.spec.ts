import { describe, expect, it } from 'vitest';
import { createDesign, createShape, createText } from '../model/factory';
import { designDataSchema } from '../model/schema';
import { colorDistance, fillToCss, konvaFill, linearGradient, parseHex, saturation } from './color';
import { pickDistinct, quantize } from './palette';
import { suggestGradients } from './suggest';

/** Build RGBA pixels from [hex | 'transparent', count] runs. */
function pixels(...runs: [string, number][]): Uint8ClampedArray {
	const out: number[] = [];
	for (const [hex, count] of runs) {
		const rgb = hex === 'transparent' ? [0, 0, 0] : parseHex(hex)!;
		for (let i = 0; i < count; i++) out.push(...rgb, hex === 'transparent' ? 0 : 255);
	}
	return new Uint8ClampedArray(out);
}

describe('palette extraction', () => {
	it('suggests the brand red of a logo, not its white margin or transparent background', () => {
		// A "red garuda" logo: mostly transparent, a white badge, red ink, a little dark outline.
		const logo = pixels(['transparent', 2000], ['#ffffff', 900], ['#c8102e', 600], ['#2b1a1a', 80]);
		const colors = pickDistinct(quantize(logo, 8));
		expect(colors[0]).toBe('#c8102e');
		expect(colors).toContain('#ffffff');
	});

	it('ignores anti-aliased blends between two colours', () => {
		// Edge pixels halfway between red ink and the white badge.
		const logo = pixels(['#ffffff', 900], ['#c8102e', 600], ['#e4889a', 60], ['#f2c4cd', 40]);
		expect(pickDistinct(quantize(logo, 8))).toEqual(['#c8102e', '#ffffff']);
	});

	it('keeps visibly different colors and drops near-duplicates', () => {
		const fish = pixels(['#2e9e6b', 500], ['#31a16e', 500], ['#e8f6ef', 400], ['#0c3d2b', 200]);
		const colors = pickDistinct(quantize(fish, 8));
		const greens = colors.filter((c) => colorDistance(parseHex(c)!, parseHex('#2f9f6c')!) < 0.05);
		expect(greens).toHaveLength(1);
		expect(colors.length).toBeGreaterThanOrEqual(3);
	});

	it('is deterministic and handles fully transparent images', () => {
		const img = pixels(['#ff0000', 10], ['#00ff00', 10], ['#0000ff', 10]);
		expect(quantize(img)).toEqual(quantize(img));
		expect(quantize(pixels(['transparent', 50]))).toEqual([]);
	});

	it('bridges lead colors of different sources into gradient suggestions', () => {
		const garuda = { key: 'a', src: 'a', label: 'Photo', colors: ['#c8102e', '#ffffff'] };
		const fish = { key: 'b', src: 'b', label: 'Graphic', colors: ['#2e9e6b', '#e8f6ef'] };
		const stops = suggestGradients([garuda, fish]).map((g) => g.stops.map((s) => s.color));
		expect(stops).toContainEqual(['#c8102e', '#ffffff']);
		expect(stops).toContainEqual(['#c8102e', '#2e9e6b']);
	});
});

describe('gradients', () => {
	it('renders CSS and Konva fills with matching geometry', () => {
		const g = linearGradient(['#5fb4ff', '#76ffc9']);
		expect(fillToCss(g)).toBe('linear-gradient(90deg, #5fb4ff 0%, #76ffc9 100%)');
		// 90° = left to right across a 200×100 box.
		const k = konvaFill(g, 200, 100) as unknown as Record<string, { x: number; y: number }>;
		expect(k.fillLinearGradientStartPoint.x).toBeCloseTo(0);
		expect(k.fillLinearGradientEndPoint.x).toBeCloseTo(200);
		expect(k.fillLinearGradientStartPoint.y).toBeCloseTo(50);
		// Solid fills pass straight through.
		expect(konvaFill('#ff0000', 10, 10)).toEqual({ fill: '#ff0000', fillPriority: 'color' });
	});

	it('are valid fills for text, shapes and page backgrounds', () => {
		const d = createDesign(100, 100);
		const g = linearGradient(['#000000', '#ffffff'], 180);
		d.pages[0].background.color = g;
		d.pages[0].elements.push(
			createText({ fill: g }),
			createShape('rect', { fill: { ...g, type: 'radial' } })
		);
		expect(designDataSchema.safeParse(d).success).toBe(true);
	});

	it('measures saturation so greys rank below brand colours', () => {
		expect(saturation([128, 128, 128])).toBe(0);
		expect(saturation([200, 16, 46])).toBeGreaterThan(0.8);
	});
});
