/**
 * The design document. Plain JSON: stored as jsonb, used for templates, and
 * mutated only through `Editor.update` so every change is undoable.
 *
 * Geometry follows Konva semantics: (x, y) is the element's unrotated top-left
 * corner and `rotation` (degrees) pivots around that point.
 */

export interface DesignData {
	width: number;
	height: number;
	pages: Page[];
}

export interface GradientStop {
	/** Position along the gradient, 0..1. */
	offset: number;
	color: string;
}

export interface Gradient {
	type: 'linear' | 'radial';
	/** CSS convention: 0° points up, 90° points right. Ignored for radial. */
	angle: number;
	stops: GradientStop[];
}

/** A solid colour (hex) or a gradient. Plain strings stay valid, so old designs load unchanged. */
export type Fill = string | Gradient;

export interface PageBackground {
	color: Fill;
	image?: { src: string; assetId?: string };
}

export interface Page {
	id: string;
	/** Optional name shown in the slide filmstrip ("3 - Problem"). */
	title?: string;
	background: PageBackground;
	elements: Element[];
	notes?: string;
}

export interface BaseElement {
	id: string;
	name?: string;
	x: number;
	y: number;
	width: number;
	height: number;
	rotation: number;
	opacity: number;
	locked: boolean;
	flipX: boolean;
	flipY: boolean;
}

export interface Shadow {
	color: string;
	blur: number;
	offsetX: number;
	offsetY: number;
	opacity: number;
}

export interface TextEffects {
	shadow?: Shadow;
	outline?: { color: string; width: number };
	background?: { color: string; padding: number; cornerRadius: number };
}

export interface TextElement extends BaseElement {
	type: 'text';
	text: string;
	fontFamily: string;
	fontSize: number;
	fontWeight: number;
	italic: boolean;
	underline: boolean;
	strike: boolean;
	letterSpacing: number;
	lineHeight: number;
	align: 'left' | 'center' | 'right' | 'justify';
	fill: Fill;
	uppercase: boolean;
	effects: TextEffects;
}

export interface Crop {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface ImageFilters {
	brightness: number; // -1..1
	contrast: number; // -100..100
	saturation: number; // -2..10 (Konva HSL)
	blur: number; // 0..40
	grayscale: boolean;
	sepia: boolean;
}

export interface ImageElement extends BaseElement {
	type: 'image';
	src: string;
	assetId?: string;
	/** Kept after background removal so it can be restored. */
	originalSrc?: string;
	naturalWidth: number;
	naturalHeight: number;
	/** Visible region of the source image, in source pixels. */
	crop: Crop;
	cornerRadius: number;
	border?: { color: string; width: number };
	filters: ImageFilters;
	shadow?: Shadow;
}

export type ShapeKind =
	| 'rect'
	| 'ellipse'
	| 'triangle'
	| 'diamond'
	| 'pentagon'
	| 'hexagon'
	| 'star'
	| 'arrow-right'
	| 'heart'
	| 'speech';

export interface ShapeElement extends BaseElement {
	type: 'shape';
	shape: ShapeKind;
	fill: Fill;
	stroke: string;
	strokeWidth: number;
	dash: boolean;
	cornerRadius: number;
	shadow?: Shadow;
}

export interface LineElement extends BaseElement {
	type: 'line';
	stroke: string;
	strokeWidth: number;
	dash: 'solid' | 'dashed' | 'dotted';
	startArrow: boolean;
	endArrow: boolean;
}

export interface IconElement extends BaseElement {
	type: 'icon';
	/** Raw SVG markup; `currentColor` is replaced by `color` when rendered. */
	svg: string;
	color: string;
}

/** Frame shapes. Clip shapes mask the image; the rest also draw a decoration around it. */
export type FrameKind =
	| 'square'
	| 'rounded'
	| 'circle'
	| 'arch'
	| 'triangle'
	| 'diamond'
	| 'hexagon'
	| 'star'
	| 'burst'
	| 'heart'
	| 'arrow'
	| 'scallop'
	| 'blob'
	| 'leaf'
	| 'parallelogram'
	| 'polaroid'
	| 'film'
	| 'phone'
	| 'tablet'
	| 'laptop'
	| 'browser'
	| 'letter';

/** The photo inside a frame; `crop` is the visible region in source pixels. */
export interface FrameImage {
	src: string;
	assetId?: string;
	naturalWidth: number;
	naturalHeight: number;
	crop: Crop;
}

export interface FrameElement extends BaseElement {
	type: 'frame';
	frame: FrameKind;
	/** The character for letter/number frames. */
	char?: string;
	image?: FrameImage;
}

export interface GroupElement extends BaseElement {
	type: 'group';
	/** Children positioned relative to the group's origin. */
	children: Element[];
}

export type Element =
	| TextElement
	| ImageElement
	| ShapeElement
	| LineElement
	| IconElement
	| FrameElement
	| GroupElement;

export type ElementType = Element['type'];
export type ElementOf<T extends ElementType> = Extract<Element, { type: T }>;
