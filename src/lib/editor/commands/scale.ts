import type { DesignData, Element } from '../model/types';

/**
 * Uniformly scale an element's geometry and size-dependent styles around the
 * page origin. Used by group resize and design resize.
 */
export function scaleElement(el: Element, s: number) {
	el.x *= s;
	el.y *= s;
	scaleSize(el, s);
}

/** Scale size and size-dependent styles, keeping the element's origin. */
export function scaleSize(el: Element, s: number) {
	el.width *= s;
	el.height *= s;
	switch (el.type) {
		case 'text':
			el.fontSize *= s;
			if (el.effects.outline) el.effects.outline.width *= s;
			if (el.effects.shadow) {
				el.effects.shadow.blur *= s;
				el.effects.shadow.offsetX *= s;
				el.effects.shadow.offsetY *= s;
			}
			if (el.effects.background) {
				el.effects.background.padding *= s;
				el.effects.background.cornerRadius *= s;
			}
			break;
		case 'shape':
			el.strokeWidth *= s;
			el.cornerRadius *= s;
			break;
		case 'line':
			el.strokeWidth *= s;
			break;
		case 'image':
			el.cornerRadius *= s;
			if (el.border) el.border.width *= s;
			break;
		case 'group':
			// Children are relative to the group origin, so scale them in place.
			for (const child of el.children) scaleElement(child, s);
			break;
	}
}

/**
 * Fit a design into new dimensions: scale everything uniformly and center the
 * result. Mutates `data` (call inside an Editor update or on a fresh copy).
 */
export function resizeDesign(data: DesignData, width: number, height: number) {
	const s = Math.min(width / data.width, height / data.height);
	const dx = (width - data.width * s) / 2;
	const dy = (height - data.height * s) / 2;
	for (const page of data.pages) {
		for (const el of page.elements) {
			scaleElement(el, s);
			el.x += dx;
			el.y += dy;
		}
	}
	data.width = width;
	data.height = height;
}
