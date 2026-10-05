import { zipSync } from 'fflate';
import type { DesignData } from '../model/types';
import { canvasToBlob, renderPage } from './export';

export type ExportFormat = 'png' | 'jpg' | 'pdf';

export interface ExportOptions {
	format: ExportFormat;
	/** Multiplier on the design size. */
	scale: number;
	transparent: boolean;
	pages: number[];
}

function saveBlob(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.append(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const safeName = (title: string) => title.replace(/[\\/:*?"<>|]+/g, '').trim() || 'design';

export async function exportDesign(data: DesignData, title: string, opts: ExportOptions) {
	const name = safeName(title);
	if (opts.format === 'pdf') {
		const { jsPDF } = await import('jspdf');
		// CSS px -> pt (1px = 0.75pt) so the PDF page matches the design's physical size.
		const w = data.width * 0.75;
		const h = data.height * 0.75;
		const pdf = new jsPDF({
			unit: 'pt',
			format: [w, h],
			orientation: w > h ? 'landscape' : 'portrait'
		});
		for (const [n, index] of opts.pages.entries()) {
			const canvas = await renderPage(data, index, { pixelRatio: Math.max(2, opts.scale) });
			if (n > 0) pdf.addPage([w, h], w > h ? 'landscape' : 'portrait');
			pdf.addImage(canvas, 'JPEG', 0, 0, w, h, undefined, 'FAST');
		}
		saveBlob(pdf.output('blob'), `${name}.pdf`);
		return;
	}

	const mime = opts.format === 'png' ? 'image/png' : 'image/jpeg';
	const blobs: Blob[] = [];
	for (const index of opts.pages) {
		const canvas = await renderPage(data, index, {
			pixelRatio: opts.scale,
			transparent: opts.format === 'png' && opts.transparent
		});
		blobs.push(await canvasToBlob(canvas, mime, 0.92));
	}
	if (blobs.length === 1) {
		saveBlob(blobs[0], `${name}.${opts.format}`);
		return;
	}
	const files: Record<string, Uint8Array> = {};
	for (const [n, blob] of blobs.entries()) {
		files[`${name}-${opts.pages[n] + 1}.${opts.format}`] = new Uint8Array(await blob.arrayBuffer());
	}
	saveBlob(new Blob([zipSync(files, { level: 0 })], { type: 'application/zip' }), `${name}.zip`);
}
