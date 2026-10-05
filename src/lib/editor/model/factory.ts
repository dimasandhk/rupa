import { current, isDraft } from 'mutative';
import { nanoid } from 'nanoid';
import type {
	BaseElement,
	DesignData,
	Element,
	Fill,
	IconElement,
	ImageElement,
	LineElement,
	Page,
	ShapeElement,
	ShapeKind,
	TextElement
} from './types';

export const newId = () => nanoid(12);

type Box = Partial<Pick<BaseElement, 'x' | 'y' | 'width' | 'height'>>;

function base(box: Box, width: number, height: number): Omit<BaseElement, 'id'> & { id: string } {
	return {
		id: newId(),
		x: box.x ?? 0,
		y: box.y ?? 0,
		width: box.width ?? width,
		height: box.height ?? height,
		rotation: 0,
		opacity: 1,
		locked: false,
		flipX: false,
		flipY: false
	};
}

export function createPage(background: Fill = '#ffffff'): Page {
	return { id: newId(), background: { color: structuredClone(background) }, elements: [] };
}

export function createDesign(width: number, height: number): DesignData {
	return { width, height, pages: [createPage()] };
}

export function createText(props: Partial<TextElement> = {}): TextElement {
	const fontSize = props.fontSize ?? 32;
	return {
		...base(props, 400, fontSize * 1.4),
		type: 'text',
		text: 'Add a little bit of body text',
		fontFamily: 'Inter',
		fontSize,
		fontWeight: 400,
		italic: false,
		underline: false,
		strike: false,
		letterSpacing: 0,
		lineHeight: 1.4,
		align: 'center',
		fill: '#000000',
		uppercase: false,
		effects: {},
		...props
	};
}

export function createShape(shape: ShapeKind, props: Partial<ShapeElement> = {}): ShapeElement {
	return {
		...base(props, 200, 200),
		type: 'shape',
		shape,
		fill: '#c4c4c4',
		stroke: '#000000',
		strokeWidth: 0,
		dash: false,
		cornerRadius: 0,
		...props
	};
}

export function createLine(props: Partial<LineElement> = {}): LineElement {
	return {
		...base(props, 300, 4),
		type: 'line',
		stroke: '#000000',
		strokeWidth: 4,
		dash: 'solid',
		startArrow: false,
		endArrow: false,
		...props
	};
}

export function createImage(
	src: string,
	naturalWidth: number,
	naturalHeight: number,
	props: Partial<ImageElement> = {}
): ImageElement {
	return {
		...base(props, naturalWidth, naturalHeight),
		type: 'image',
		src,
		naturalWidth,
		naturalHeight,
		crop: { x: 0, y: 0, width: naturalWidth, height: naturalHeight },
		cornerRadius: 0,
		filters: {
			brightness: 0,
			contrast: 0,
			saturation: 0,
			blur: 0,
			grayscale: false,
			sepia: false
		},
		...props
	};
}

export function createIcon(svg: string, props: Partial<IconElement> = {}): IconElement {
	return { ...base(props, 160, 160), type: 'icon', svg, color: '#000000', ...props };
}

/** Deep copy that also works on mutative drafts (proxies can't be structured-cloned). */
export function deepClone<T>(value: T): T {
	return structuredClone(isDraft(value) ? (current(value as object) as T) : value);
}

/** Deep-copy an element (and group children) with fresh ids. */
export function cloneWithNewIds<T extends Element>(el: T): T {
	const copy = deepClone(el);
	const reId = (e: Element) => {
		e.id = newId();
		if (e.type === 'group') e.children.forEach(reId);
	};
	reId(copy);
	return copy;
}
