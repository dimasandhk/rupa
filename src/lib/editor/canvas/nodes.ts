import Konva from 'konva';
import type {
	Element,
	IconElement,
	ImageElement,
	LineElement,
	Shadow,
	ShapeElement,
	TextElement
} from '../model/types';
import { ensureFont, isFontReady } from './fonts';
import { getImage, svgToDataUrl } from './images';
import { PATHS, POLYGONS } from './shapes';

export interface BuildContext {
	/** Called when an async resource (image, font) for this element becomes ready. */
	invalidate: (id: string) => void;
	/** Reports the laid-out height of a text element. */
	measured: (id: string, height: number) => void;
}

/**
 * (Re)build the visual content of an element inside its group. The group keeps
 * position/rotation/opacity; content lives in an inner group that handles flips.
 */
export function buildElement(group: Konva.Group, el: Element, ctx: BuildContext) {
	group.destroyChildren();
	group.setAttrs({
		x: el.x,
		y: el.y,
		rotation: el.rotation,
		opacity: el.opacity,
		scaleX: 1,
		scaleY: 1,
		width: el.width,
		height: el.height
	});
	// Invisible box: gives a hit area over the full frame and stable bounds for the transformer.
	group.add(
		new Konva.Rect({ width: el.width, height: el.height, fill: 'transparent', name: 'hitbox' })
	);

	const content = new Konva.Group({
		x: el.flipX ? el.width : 0,
		y: el.flipY ? el.height : 0,
		scaleX: el.flipX ? -1 : 1,
		scaleY: el.flipY ? -1 : 1
	});
	group.add(content);

	switch (el.type) {
		case 'text':
			buildText(content, el, ctx);
			break;
		case 'shape':
			buildShape(content, el);
			break;
		case 'line':
			buildLine(content, el);
			break;
		case 'image':
			buildImage(content, el, ctx);
			break;
		case 'icon':
			buildIcon(content, el, ctx);
			break;
		case 'group': {
			// Async resources of a child re-render the whole (top-level) group.
			const childCtx = { ...ctx, invalidate: () => ctx.invalidate(el.id) };
			for (const child of el.children) {
				const g = new Konva.Group({ listening: false });
				content.add(g);
				buildElement(g, child, childCtx);
			}
			break;
		}
	}
}

function shadowAttrs(s?: Shadow) {
	if (!s) return { shadowEnabled: false };
	return {
		shadowEnabled: true,
		shadowColor: s.color,
		shadowBlur: s.blur,
		shadowOffsetX: s.offsetX,
		shadowOffsetY: s.offsetY,
		shadowOpacity: s.opacity
	};
}

export function textAttrs(el: TextElement): Konva.TextConfig {
	const decoration = [el.underline && 'underline', el.strike && 'line-through']
		.filter(Boolean)
		.join(' ');
	return {
		text: el.uppercase ? el.text.toUpperCase() : el.text,
		width: el.width,
		fontFamily: `"${el.fontFamily}"`,
		fontSize: el.fontSize,
		fontStyle: `${el.italic ? 'italic ' : ''}${el.fontWeight}`,
		textDecoration: decoration,
		letterSpacing: el.letterSpacing,
		lineHeight: el.lineHeight,
		align: el.align,
		fill: el.fill,
		wrap: 'word'
	};
}

function buildText(content: Konva.Group, el: TextElement, ctx: BuildContext) {
	if (!isFontReady(el.fontFamily, el.fontWeight, el.italic)) {
		ensureFont(el.fontFamily, el.fontWeight, el.italic).then(() => ctx.invalidate(el.id));
	}
	const node = new Konva.Text({
		...textAttrs(el),
		...shadowAttrs(el.effects.shadow),
		stroke: el.effects.outline?.color,
		strokeWidth: el.effects.outline?.width ?? 0,
		fillAfterStrokeEnabled: true,
		name: 'text'
	});
	const bg = el.effects.background;
	if (bg) {
		const p = bg.padding;
		content.add(
			new Konva.Rect({
				x: -p,
				y: -p,
				width: el.width + p * 2,
				height: node.height() + p * 2,
				fill: bg.color,
				cornerRadius: bg.cornerRadius
			})
		);
	}
	content.add(node);
	ctx.measured(el.id, node.height());
}

function buildShape(content: Konva.Group, el: ShapeElement) {
	const { width: w, height: h } = el;
	const style = {
		fill: el.fill,
		stroke: el.strokeWidth > 0 ? el.stroke : undefined,
		strokeWidth: el.strokeWidth,
		dash: el.dash ? [el.strokeWidth * 3, el.strokeWidth * 2] : undefined,
		...shadowAttrs(el.shadow)
	};
	if (el.shape === 'rect') {
		const r = Math.min(el.cornerRadius, w / 2, h / 2);
		content.add(new Konva.Rect({ width: w, height: h, cornerRadius: r, ...style }));
	} else if (el.shape === 'ellipse') {
		content.add(
			new Konva.Ellipse({ x: w / 2, y: h / 2, radiusX: w / 2, radiusY: h / 2, ...style })
		);
	} else if (POLYGONS[el.shape]) {
		const points = POLYGONS[el.shape]!.map((v, i) => v * (i % 2 === 0 ? w : h));
		content.add(new Konva.Line({ points, closed: true, lineJoin: 'round', ...style }));
	} else if (PATHS[el.shape]) {
		content.add(
			new Konva.Path({
				data: PATHS[el.shape],
				scaleX: w / 100,
				scaleY: h / 100,
				strokeScaleEnabled: false,
				...style
			})
		);
	}
}

function buildLine(content: Konva.Group, el: LineElement) {
	const sw = el.strokeWidth;
	const dash =
		el.dash === 'dashed' ? [sw * 3, sw * 2] : el.dash === 'dotted' ? [0.01, sw * 2] : undefined;
	content.add(
		new Konva.Arrow({
			points: [0, el.height / 2, el.width, el.height / 2],
			stroke: el.stroke,
			fill: el.stroke,
			strokeWidth: sw,
			dash,
			lineCap: el.dash === 'dotted' ? 'round' : 'butt',
			pointerAtBeginning: el.startArrow,
			pointerAtEnding: el.endArrow,
			pointerLength: sw * 3,
			pointerWidth: sw * 3,
			hitStrokeWidth: Math.max(20, sw)
		})
	);
}

function placeholder(w: number, h: number) {
	return new Konva.Rect({ width: w, height: h, fill: '#e5e7eb' });
}

function buildImage(content: Konva.Group, el: ImageElement, ctx: BuildContext) {
	const img = getImage(el.src, () => ctx.invalidate(el.id));
	if (!img) {
		content.add(placeholder(el.width, el.height));
		return;
	}
	const node = new Konva.Image({
		image: img,
		width: el.width,
		height: el.height,
		crop: el.crop,
		cornerRadius: el.cornerRadius,
		stroke: el.border?.width ? el.border.color : undefined,
		strokeWidth: el.border?.width ?? 0,
		...shadowAttrs(el.shadow)
	});
	const f = el.filters;
	const filters: Konva.Filter[] = [];
	if (f.brightness) filters.push(Konva.Filters.Brighten);
	if (f.contrast) filters.push(Konva.Filters.Contrast);
	if (f.saturation) filters.push(Konva.Filters.HSL);
	if (f.blur) filters.push(Konva.Filters.Blur);
	if (f.grayscale) filters.push(Konva.Filters.Grayscale);
	if (f.sepia) filters.push(Konva.Filters.Sepia);
	if (filters.length) {
		node.brightness(f.brightness);
		node.contrast(f.contrast);
		node.saturation(f.saturation);
		node.blurRadius(f.blur);
		node.filters(filters);
		// Cache at source resolution (capped) so filtered images stay sharp when exported.
		const ratio = Math.min(4, Math.max(1, el.crop.width / Math.max(1, el.width)));
		node.cache({ pixelRatio: ratio });
	}
	content.add(node);
}

function buildIcon(content: Konva.Group, el: IconElement, ctx: BuildContext) {
	const img = getImage(svgToDataUrl(el.svg, el.color), () => ctx.invalidate(el.id));
	content.add(
		img
			? new Konva.Image({ image: img, width: el.width, height: el.height })
			: new Konva.Rect({ width: el.width, height: el.height })
	);
}
