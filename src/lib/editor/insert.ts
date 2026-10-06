import { uploadImage, type UploadedImage } from '#lib/api.ts';
import { ensureFont } from './canvas/fonts';
import {
	createFrame,
	createIcon,
	createImage,
	createLine,
	createShape,
	createText
} from './model/factory';
import { FRAMES } from './model/frames';
import type { Fill, FrameKind, ShapeKind, TextElement } from './model/types';
import type { Editor, FramePhoto } from './state/editor.svelte';

export interface TextPreset {
	label: string;
	props: Partial<TextElement>;
}

/** Sizes are relative to a 1080px-wide design and scaled to the actual page. */
export const TEXT_PRESETS: TextPreset[] = [
	{ label: 'Add a heading', props: { text: 'Add a heading', fontSize: 96, fontWeight: 700 } },
	{ label: 'Add a subheading', props: { text: 'Add a subheading', fontSize: 56, fontWeight: 600 } },
	{
		label: 'Add a little bit of body text',
		props: { text: 'Add a little bit of body text', fontSize: 32 }
	}
];

function scaleFor(editor: Editor) {
	return Math.max(0.25, Math.min(editor.data.width, editor.data.height) / 1080);
}

export function addText(editor: Editor, props: Partial<TextElement> = TEXT_PRESETS[2].props) {
	const s = scaleFor(editor);
	const fontSize = (props.fontSize ?? 32) * s;
	const width = Math.min(
		editor.data.width * 0.8,
		Math.max(fontSize * (props.text?.length ?? 10) * 0.6, 200 * s)
	);
	const el = createText({ ...props, fontSize, width, height: fontSize * 1.4 });
	ensureFont(el.fontFamily, el.fontWeight, el.italic);
	editor.addElements([el]);
	return el;
}

export function addShape(editor: Editor, kind: ShapeKind) {
	const size = Math.min(editor.data.width, editor.data.height) * 0.3;
	const h = kind === 'arrow-right' || kind === 'speech' ? size * 0.75 : size;
	editor.addElements([createShape(kind, { width: size, height: h })]);
}

export function addLine(
	editor: Editor,
	props: { endArrow?: boolean; dash?: 'solid' | 'dashed' | 'dotted' } = {}
) {
	const s = scaleFor(editor);
	editor.addElements([
		createLine({ width: editor.data.width * 0.4, height: 4 * s, strokeWidth: 4 * s, ...props })
	]);
}

/**
 * Place a photo. If a frame is selected, the photo goes into the frame
 * instead (Canva-style "click a photo to fill the selected frame").
 */
export function addImage(
	editor: Editor,
	src: string,
	width: number,
	height: number,
	assetId?: string,
	at?: { x: number; y: number }
) {
	const sel = editor.selectedElements;
	if (!at && sel.length === 1 && sel[0].type === 'frame' && !sel[0].locked) {
		editor.fillFrame(sel[0].id, { src, assetId, naturalWidth: width, naturalHeight: height });
		return;
	}
	editor.addElements(
		[createImage(src, width, height, { assetId })],
		at ? { at } : { center: true }
	);
}

export function addIcon(editor: Editor, svg: string, name?: string) {
	const size = Math.min(editor.data.width, editor.data.height) * 0.25;
	editor.addElements([createIcon(svg, { width: size, height: size, name })]);
}

export function addFrame(editor: Editor, kind: FrameKind, char?: string) {
	const def = FRAMES[kind];
	const side = Math.min(editor.data.width, editor.data.height) * 0.42;
	const width = def.aspect >= 1 ? side : side * def.aspect;
	const height = def.aspect >= 1 ? side / def.aspect : side;
	editor.addElements([createFrame(kind, { width, height, char })]);
}

// ---- Drag & drop from side panels onto the canvas.
// The drag carries a marker type; the photo itself is resolved on drop
// (stock photos are only imported into storage once actually used).

export const DRAG_IMAGE_TYPE = 'application/x-rupa-image';
let pendingDrag: (() => Promise<FramePhoto>) | undefined;

export function startImageDrag(e: DragEvent, resolve: () => Promise<FramePhoto>) {
	pendingDrag = resolve;
	e.dataTransfer?.setData(DRAG_IMAGE_TYPE, '1');
	if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
}

export function takeImageDrag(): (() => Promise<FramePhoto>) | undefined {
	const r = pendingDrag;
	pendingDrag = undefined;
	return r;
}

/** Upload a local image file to storage; returns it ready to place or put in a frame. */
export async function uploadImageFile(file: File): Promise<FramePhoto & { upload: UploadedImage }> {
	const size = await imageSize(file);
	const up = await uploadImage(file, size);
	return {
		src: up.url,
		assetId: up.id,
		naturalWidth: size.width,
		naturalHeight: size.height,
		upload: up
	};
}

export async function imageSize(blob: Blob) {
	const bmp = await createImageBitmap(blob);
	const size = { width: bmp.width, height: bmp.height };
	bmp.close();
	return size;
}

/** Upload a local file and place it on the active page. */
export async function addImageFile(editor: Editor, file: File) {
	const photo = await uploadImageFile(file);
	addImage(editor, photo.src, photo.naturalWidth, photo.naturalHeight, photo.assetId);
	return photo.upload;
}

export function setBackgroundColor(editor: Editor, color: Fill) {
	editor.updatePage(
		(p) => {
			p.background.color = color;
		},
		{ key: `bg-${editor.activePageIndex}` }
	);
}
