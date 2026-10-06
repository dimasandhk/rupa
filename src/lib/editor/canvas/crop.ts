import Konva from 'konva';
import { rotate } from '../model/geometry';
import { frameScreen } from '../model/frames';
import type { Crop, FrameElement, ImageElement } from '../model/types';

export interface CropResult {
	x: number;
	y: number;
	width: number;
	height: number;
	crop: Crop;
}

export interface CropSession {
	/** True if a Konva node belongs to the crop UI (clicks on it shouldn't end cropping). */
	owns(node: Konva.Node): boolean;
	result(): CropResult;
	destroy(): void;
}

const BRAND = '#c2553a';

/**
 * Canva-style crop mode, drawn in element-local coordinates (so rotated images
 * work): the whole photo is shown dimmed, the frame shows the kept part at full
 * opacity. Drag the photo to reposition it; resize the frame with its handles.
 */
export function startCrop(
	layer: Konva.Layer,
	el: ImageElement,
	img: HTMLImageElement,
	onChange: () => void
): CropSession {
	// Display pixels per source pixel.
	const sx = el.width / el.crop.width;
	const sy = el.height / el.crop.height;
	const full = { width: el.naturalWidth * sx, height: el.naturalHeight * sy };

	const root = new Konva.Group({ x: el.x, y: el.y, rotation: el.rotation, name: 'crop-ui' });
	const photo = { x: -el.crop.x * sx, y: -el.crop.y * sy };
	const frame = { x: 0, y: 0, width: el.width, height: el.height };

	const ghost = new Konva.Image({ image: img, ...photo, ...full, opacity: 0.35, draggable: true });
	const clip = new Konva.Group({ listening: false });
	const bright = new Konva.Image({ image: img, ...photo, ...full });
	clip.add(bright);
	const border = new Konva.Rect({
		...frame,
		stroke: BRAND,
		strokeWidth: 2,
		strokeScaleEnabled: false,
		listening: false
	});
	// Invisible rect the transformer resizes; it mirrors `frame`.
	const handle = new Konva.Rect({ ...frame, fill: 'transparent', listening: false });
	const tr = new Konva.Transformer({
		nodes: [handle],
		rotateEnabled: false,
		keepRatio: false,
		flipEnabled: false,
		ignoreStroke: true,
		borderEnabled: false,
		anchorSize: 11,
		anchorStroke: BRAND,
		anchorFill: '#ffffff',
		anchorCornerRadius: 3,
		enabledAnchors: [
			'top-left',
			'top-center',
			'top-right',
			'middle-right',
			'bottom-right',
			'bottom-center',
			'bottom-left',
			'middle-left'
		]
	});
	root.add(ghost, clip, border, handle);
	layer.add(root, tr);

	function redraw() {
		clip.clipFunc((ctx) => ctx.rect(frame.x, frame.y, frame.width, frame.height));
		bright.position(ghost.position());
		border.setAttrs(frame);
		handle.setAttrs({ ...frame, scaleX: 1, scaleY: 1 });
		tr.forceUpdate();
		layer.batchDraw();
		onChange();
	}

	// The photo must always cover the frame.
	ghost.on('dragmove', () => {
		ghost.x(Math.min(frame.x, Math.max(frame.x + frame.width - full.width, ghost.x())));
		ghost.y(Math.min(frame.y, Math.max(frame.y + frame.height - full.height, ghost.y())));
		redraw();
	});

	// The frame may not grow beyond the photo.
	tr.on('transform', () => {
		const gx = ghost.x();
		const gy = ghost.y();
		const x = Math.max(gx, handle.x());
		const y = Math.max(gy, handle.y());
		const right = Math.min(gx + full.width, handle.x() + handle.width() * handle.scaleX());
		const bottom = Math.min(gy + full.height, handle.y() + handle.height() * handle.scaleY());
		Object.assign(frame, {
			x,
			y,
			width: Math.max(10, right - x),
			height: Math.max(10, bottom - y)
		});
		redraw();
	});

	redraw();
	// Draw now (not on the next frame) so the crop UI is hittable immediately.
	layer.draw();

	return {
		owns(node) {
			for (let n: Konva.Node | null = node; n; n = n.getParent())
				if (n === root || n === tr) return true;
			return false;
		},
		result() {
			const origin = rotate({ x: frame.x, y: frame.y }, el.rotation);
			return {
				x: el.x + origin.x,
				y: el.y + origin.y,
				width: frame.width,
				height: frame.height,
				crop: {
					x: (frame.x - ghost.x()) / sx,
					y: (frame.y - ghost.y()) / sy,
					width: frame.width / sx,
					height: frame.height / sy
				}
			};
		},
		destroy() {
			tr.destroy();
			root.destroy();
			layer.batchDraw();
		}
	};
}

export interface FrameCropSession {
	owns(node: Konva.Node): boolean;
	/** New crop for the frame's photo (the frame itself never moves). */
	result(): Crop;
	destroy(): void;
}

/**
 * Adjust the photo inside a frame: the frame stays put while the photo can be
 * dragged to reposition it and scaled from its corners. The photo always keeps
 * covering the frame's photo area.
 */
export function startFrameCrop(
	layer: Konva.Layer,
	el: FrameElement,
	img: HTMLImageElement,
	clip: (r: { x: number; y: number; width: number; height: number }) => Path2D
): FrameCropSession {
	const photo = el.image!;
	const screen = frameScreen(el);
	const s0 = screen.width / photo.crop.width; // display px per source px
	const root = new Konva.Group({ x: el.x, y: el.y, rotation: el.rotation, name: 'crop-ui' });
	const start = {
		x: screen.x - photo.crop.x * s0,
		y: screen.y - photo.crop.y * s0,
		width: photo.naturalWidth * s0,
		height: photo.naturalHeight * s0
	};
	const ghost = new Konva.Image({ image: img, ...start, opacity: 0.35, draggable: true });
	const bright = new Konva.Image({ image: img, ...start, listening: false });
	const viewport = new Konva.Group({ listening: false, clipFunc: () => [clip(screen)] });
	viewport.add(bright);
	const outline = new Konva.Rect({
		...screen,
		stroke: BRAND,
		strokeWidth: 2,
		strokeScaleEnabled: false,
		cornerRadius: screen.radius,
		listening: false
	});
	const tr = new Konva.Transformer({
		nodes: [ghost],
		rotateEnabled: false,
		keepRatio: true,
		flipEnabled: false,
		enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
		anchorSize: 11,
		anchorStroke: BRAND,
		anchorFill: '#ffffff',
		anchorCornerRadius: 3,
		borderStroke: BRAND,
		borderDash: [4, 4],
		// Never let the photo shrink smaller than the frame.
		boundBoxFunc: (oldBox, box) => {
			const scale = layer.getStage()?.scaleX() ?? 1;
			return box.width / scale < screen.width || box.height / scale < screen.height ? oldBox : box;
		}
	});
	root.add(ghost, viewport, outline);
	layer.add(root, tr);

	const size = () => ({ w: ghost.width() * ghost.scaleX(), h: ghost.height() * ghost.scaleY() });
	function clamp() {
		const { w, h } = size();
		ghost.x(Math.min(screen.x, Math.max(screen.x + screen.width - w, ghost.x())));
		ghost.y(Math.min(screen.y, Math.max(screen.y + screen.height - h, ghost.y())));
	}
	function redraw() {
		bright.position(ghost.position());
		bright.scale(ghost.scale());
		tr.forceUpdate();
		layer.batchDraw();
	}
	ghost.on('dragmove transform', () => {
		clamp();
		redraw();
	});
	redraw();
	layer.draw();

	return {
		owns(node) {
			for (let n: Konva.Node | null = node; n; n = n.getParent())
				if (n === root || n === tr) return true;
			return false;
		},
		result() {
			const s = size().w / photo.naturalWidth;
			return {
				x: (screen.x - ghost.x()) / s,
				y: (screen.y - ghost.y()) / s,
				width: screen.width / s,
				height: screen.height / s
			};
		},
		destroy() {
			tr.destroy();
			root.destroy();
			layer.batchDraw();
		}
	};
}
