import { PUBLIC_BG_REMOVAL_PROVIDER } from '$app/env/public';
import { uploadImage } from '#lib/api.ts';

export type Progress = (message: string) => void;

/**
 * Remove an image's background and store the result. Returns the new image URL.
 *
 * - `browser` (default): runs an ISNet model locally via ONNX/WebAssembly
 *   (@imgly/background-removal). Free and private; the model (~40 MB) is
 *   downloaded once and cached by the browser.
 * - `api`: sends the image to the server, which calls fal.ai (BiRefNet).
 */
export async function removeBackground(src: string, onProgress?: Progress): Promise<string> {
	const source = await fetch(src).then((r) => {
		if (!r.ok) throw new Error('Could not read the image');
		return r.blob();
	});

	if (PUBLIC_BG_REMOVAL_PROVIDER === 'api') {
		onProgress?.('Removing background…');
		const form = new FormData();
		form.set('file', source);
		const res = await fetch('/api/ai/remove-bg', { method: 'POST', body: form });
		const body = await res.json().catch(() => ({}));
		if (!res.ok) throw new Error(body.message ?? 'Background removal failed');
		return body.url;
	}

	onProgress?.('Loading AI model…');
	const { removeBackground: run } = await import('@imgly/background-removal');
	const result = await run(source, {
		model: 'isnet_fp16',
		proxyToWorker: true,
		output: { format: 'image/png' },
		progress: (key: string, current: number, total: number) => {
			if (key.startsWith('fetch') && total)
				onProgress?.(`Downloading model ${Math.round((current / total) * 100)}%`);
			else if (key.startsWith('compute')) onProgress?.('Removing background…');
		}
	});
	const bmp = await createImageBitmap(result);
	const size = { width: bmp.width, height: bmp.height };
	bmp.close();
	onProgress?.('Saving…');
	const up = await uploadImage(result, { ...size, kind: 'bg_removed' });
	return up.url;
}
