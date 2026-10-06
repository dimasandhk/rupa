import Konva from 'konva';
import { FRAMES, frameScreen, LETTER_FONT, type ScreenRect } from '../model/frames';
import type { FrameElement } from '../model/types';
import { ensureFont, isFontReady } from './fonts';
import { getImage } from './images';
import type { BuildContext } from './nodes';

const INK = '#1f1b17';
const BEZEL = '#2a2622';

/** Path2D for an SVG path in a 100×100 box, stretched over `r`. */
function boxPath(d: string, r: { x: number; y: number; width: number; height: number }) {
	const p = new Path2D();
	p.addPath(new Path2D(d), new DOMMatrix([r.width / 100, 0, 0, r.height / 100, r.x, r.y]));
	return p;
}

function roundedRectPath(r: ScreenRect) {
	const p = new Path2D();
	p.roundRect(r.x, r.y, r.width, r.height, r.radius);
	return p;
}

/** Clip path of a frame's photo area, for a photo area placed at `r`. */
export function frameClipPath(
	el: Pick<FrameElement, 'frame'>,
	r: { x: number; y: number; width: number; height: number; radius?: number }
) {
	const clip = FRAMES[el.frame].clip;
	return clip ? boxPath(clip, r) : roundedRectPath({ radius: 0, ...r });
}

/** Soft landscape shown in empty frames: "drop a photo here". */
function placeholder(w: number, h: number) {
	const g = new Konva.Group({ listening: false });
	g.add(new Konva.Rect({ width: w, height: h, fill: '#ebe4d9' }));
	g.add(
		new Konva.Circle({
			x: w * 0.7,
			y: h * 0.32,
			radius: Math.min(w, h) * 0.09,
			fill: '#f1c2a8'
		})
	);
	const hill = (d: string, fill: string) =>
		new Konva.Path({ data: d, fill, scaleX: w / 100, scaleY: h / 100 });
	g.add(hill('M0 70C18 58 38 58 58 66S88 76 100 64V100H0Z', '#d3c6b3'));
	g.add(hill('M0 84C24 74 52 77 74 85S94 92 100 88V100H0Z', '#bcac94'));
	return g;
}

/** Decorations drawn behind the photo (card, device body). */
function decorationBelow(el: FrameElement): Konva.Shape[] {
	const { width: w, height: h } = el;
	switch (el.frame) {
		case 'polaroid':
			return [
				new Konva.Rect({
					width: w,
					height: h,
					fill: '#fdfcf9',
					cornerRadius: w * 0.012,
					shadowColor: '#4a341e',
					shadowBlur: w * 0.04,
					shadowOffsetY: w * 0.012,
					shadowOpacity: 0.22
				})
			];
		case 'film': {
			const nodes: Konva.Shape[] = [
				new Konva.Rect({ width: w, height: h, fill: '#18140f', cornerRadius: w * 0.012 })
			];
			// Sprocket holes along the top and bottom edges.
			const holeW = w * 0.035;
			const holeH = h * 0.07;
			const count = Math.max(6, Math.round(w / (holeW * 2.4)));
			const step = w / count;
			for (let i = 0; i < count; i++) {
				const x = i * step + (step - holeW) / 2;
				for (const y of [h * 0.05, h - h * 0.05 - holeH]) {
					nodes.push(
						new Konva.Rect({
							x,
							y,
							width: holeW,
							height: holeH,
							fill: '#f6f2eb',
							cornerRadius: holeW * 0.25
						})
					);
				}
			}
			return nodes;
		}
		case 'phone':
			return [new Konva.Rect({ width: w, height: h, fill: BEZEL, cornerRadius: w * 0.14 })];
		case 'tablet':
			return [new Konva.Rect({ width: w, height: h, fill: BEZEL, cornerRadius: w * 0.05 })];
		case 'laptop':
			return [
				// Lid with bezel, then the keyboard base as a flat trapezoid.
				new Konva.Rect({
					x: w * 0.12,
					y: 0,
					width: w * 0.76,
					height: h * 0.84,
					fill: BEZEL,
					cornerRadius: w * 0.02
				}),
				new Konva.Line({
					points: [0, h * 0.88, w, h * 0.88, w * 0.96, h, w * 0.04, h],
					closed: true,
					fill: '#c9c1b5'
				}),
				new Konva.Rect({
					x: 0,
					y: h * 0.84,
					width: w,
					height: h * 0.05,
					fill: '#ddd5ca',
					cornerRadius: h * 0.01
				})
			];
		case 'browser': {
			const bar = h * 0.1;
			const dot = bar * 0.16;
			return [
				new Konva.Rect({
					width: w,
					height: h,
					fill: '#f3eee6',
					cornerRadius: w * 0.025,
					shadowColor: '#4a341e',
					shadowBlur: w * 0.03,
					shadowOffsetY: w * 0.008,
					shadowOpacity: 0.2
				}),
				...['#e8857a', '#e9c46a', '#8fc093'].map(
					(fill, i) =>
						new Konva.Circle({ x: bar * 0.55 + i * dot * 3.2, y: bar / 2, radius: dot, fill })
				),
				new Konva.Rect({
					x: bar * 2.2,
					y: bar * 0.28,
					width: w * 0.5,
					height: bar * 0.44,
					fill: '#ffffff',
					cornerRadius: bar * 0.22
				})
			];
		}
		default:
			return [];
	}
}

/** Decorations drawn over the photo (phone notch). */
function decorationAbove(el: FrameElement): Konva.Shape[] {
	if (el.frame !== 'phone') return [];
	const { width: w, height: h } = el;
	return [
		new Konva.Rect({
			x: w * 0.36,
			y: h * 0.035,
			width: w * 0.28,
			height: h * 0.022,
			fill: INK,
			cornerRadius: h * 0.011
		})
	];
}

/** Draw the photo (or placeholder art) and keep only the pixels inside the glyph. */
function letterCutout(el: FrameElement, screen: ScreenRect, img?: HTMLImageElement) {
	const ratio = 2;
	const canvas = document.createElement('canvas');
	canvas.width = Math.max(1, Math.round(screen.width * ratio));
	canvas.height = Math.max(1, Math.round(screen.height * ratio));
	const c = canvas.getContext('2d')!;
	const { width: w, height: h } = canvas;
	if (img && el.image) {
		const k = el.image.crop;
		c.drawImage(img, k.x, k.y, k.width, k.height, 0, 0, w, h);
	} else {
		c.fillStyle = '#ebe4d9';
		c.fillRect(0, 0, w, h);
		c.fillStyle = '#f1c2a8';
		c.beginPath();
		c.arc(w * 0.7, h * 0.32, Math.min(w, h) * 0.09, 0, Math.PI * 2);
		c.fill();
		const hill = (d: string, fill: string) => {
			const p = new Path2D();
			p.addPath(new Path2D(d), new DOMMatrix([w / 100, 0, 0, h / 100, 0, 0]));
			c.fillStyle = fill;
			c.fill(p);
		};
		hill('M0 70C18 58 38 58 58 66S88 76 100 64V100H0Z', '#d3c6b3');
		hill('M0 84C24 74 52 77 74 85S94 92 100 88V100H0Z', '#bcac94');
	}
	c.globalCompositeOperation = 'destination-in';
	c.fillStyle = '#000';
	c.textAlign = 'center';
	c.textBaseline = 'middle';
	c.font = `${h * 1.02}px "${LETTER_FONT}"`;
	// Glyph metrics put caps slightly low; nudge to optically centre them.
	c.fillText(el.char ?? 'A', w / 2, h * 0.53, w);
	return canvas;
}

export function buildFrame(content: Konva.Group, el: FrameElement, ctx: BuildContext) {
	const def = FRAMES[el.frame];
	const screen = frameScreen(el);
	for (const n of decorationBelow(el)) content.add(n);

	const photo = new Konva.Group({ x: screen.x, y: screen.y });
	const local = { ...screen, x: 0, y: 0 };
	if (def.clip) {
		const clip = def.clip;
		photo.clipFunc(() => [boxPath(clip, local)]);
	} else if (def.screen) {
		photo.clipFunc(() => [roundedRectPath(local)]);
	}

	const img = el.image ? getImage(el.image.src, () => ctx.invalidate(el.id)) : undefined;
	if (el.frame === 'letter') {
		// Letter frames: the photo cut to the glyph, composed on an offscreen canvas.
		if (!isFontReady(LETTER_FONT, 400))
			ensureFont(LETTER_FONT, 400).then(() => ctx.invalidate(el.id));
		photo.add(
			new Konva.Image({
				image: letterCutout(el, screen, img),
				width: screen.width,
				height: screen.height
			})
		);
	} else if (el.image && img) {
		photo.add(
			new Konva.Image({
				image: img,
				width: screen.width,
				height: screen.height,
				crop: el.image.crop
			})
		);
	} else {
		photo.add(placeholder(screen.width, screen.height));
	}

	content.add(photo);
	for (const n of decorationAbove(el)) content.add(n);
}
