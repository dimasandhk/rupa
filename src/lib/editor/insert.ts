import { uploadImage } from '#lib/api.ts';
import { ensureFont } from './canvas/fonts';
import { createIcon, createImage, createLine, createShape, createText } from './model/factory';
import type { Fill, ShapeKind, TextElement } from './model/types';
import type { Editor } from './state/editor.svelte';

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

export function addImage(
	editor: Editor,
	src: string,
	width: number,
	height: number,
	assetId?: string
) {
	editor.addElements([createImage(src, width, height, { assetId })]);
}

export function addIcon(editor: Editor, svg: string) {
	const size = Math.min(editor.data.width, editor.data.height) * 0.25;
	editor.addElements([createIcon(svg, { width: size, height: size })]);
}

export async function imageSize(blob: Blob) {
	const bmp = await createImageBitmap(blob);
	const size = { width: bmp.width, height: bmp.height };
	bmp.close();
	return size;
}

/** Upload a local file and place it on the active page. */
export async function addImageFile(editor: Editor, file: File) {
	const size = await imageSize(file);
	const up = await uploadImage(file, size);
	addImage(editor, up.url, size.width, size.height, up.id);
	return up;
}

export function setBackgroundColor(editor: Editor, color: Fill) {
	editor.updatePage(
		(p) => {
			p.background.color = color;
		},
		{ key: `bg-${editor.activePageIndex}` }
	);
}
