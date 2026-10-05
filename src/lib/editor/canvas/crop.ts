import Konva from 'konva';
import { rotate } from '../model/geometry';
import type { Crop, ImageElement } from '../model/types';

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

const BRAND = '#8b3dff';

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
		anchorSize: 14,
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
