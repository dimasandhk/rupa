import Konva from 'konva';
import type { DesignData, Element } from '../model/types';
import { LETTER_FONT } from '../model/frames';
import { ensureFont } from './fonts';
import { svgToDataUrl, waitForImages } from './images';
import { PageRenderer } from './renderer';

function collect(els: Element[], srcs: string[], fonts: Promise<boolean>[]) {
	for (const el of els) {
		if (el.type === 'image') srcs.push(el.src);
		else if (el.type === 'icon') srcs.push(svgToDataUrl(el.svg, el.color));
		else if (el.type === 'text') fonts.push(ensureFont(el.fontFamily, el.fontWeight, el.italic));
		else if (el.type === 'frame') {
			if (el.image) srcs.push(el.image.src);
			if (el.frame === 'letter') fonts.push(ensureFont(LETTER_FONT, 400));
		} else if (el.type === 'group') collect(el.children, srcs, fonts);
	}
}

/** Load every image and font a page needs, so an offscreen render is complete. */
async function prepare(data: DesignData, pageIndex: number) {
	const page = data.pages[pageIndex];
	const srcs: string[] = page.background.image ? [page.background.image.src] : [];
	const fonts: Promise<boolean>[] = [];
	collect(page.elements, srcs, fonts);
	await Promise.all([waitForImages(srcs), Promise.allSettled(fonts)]);
}

export interface RenderOptions {
	/** Output scale relative to the design size (2 = twice the pixels). */
	pixelRatio?: number;
	/** Skip the page background color (PNG with transparency). */
	transparent?: boolean;
}

/** Render one page into a canvas, independent of the on-screen editor. */
export async function renderPage(data: DesignData, pageIndex: number, opts: RenderOptions = {}) {
	await prepare(data, pageIndex);
	const container = document.createElement('div');
	const stage = new Konva.Stage({ container, width: data.width, height: data.height });
	const layer = new Konva.Layer();
	stage.add(layer);
	const renderer = new PageRenderer(layer, data, { onMeasured: () => {}, interactive: false });
	try {
		renderer.sync(data.pages[pageIndex]);
		if (opts.transparent) renderer.background.visible(false);
		return layer.toCanvas({ pixelRatio: opts.pixelRatio ?? 1 });
	} finally {
		renderer.destroy();
		stage.destroy();
	}
}

export function canvasToBlob(
	canvas: HTMLCanvasElement,
	type = 'image/png',
	quality?: number
): Promise<Blob> {
	return new Promise((resolve, reject) =>
		canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Export failed'))), type, quality)
	);
}

/** Small JPEG of page 1 for the dashboard. */
export async function renderThumbnail(data: DesignData, maxSize = 480) {
	const ratio = Math.min(1, maxSize / Math.max(data.width, data.height));
	const canvas = await renderPage(data, 0, { pixelRatio: ratio });
	return canvasToBlob(canvas, 'image/jpeg', 0.82);
}
