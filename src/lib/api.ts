/** Thin client for the app's JSON API. */

async function request<T>(url: string, init?: RequestInit): Promise<T> {
	const res = await fetch(url, init);
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw Object.assign(new Error(body.message ?? `Request failed (${res.status})`), {
			status: res.status
		});
	}
	return res.status === 204 ? (undefined as T) : res.json();
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
	method,
	headers: { 'content-type': 'application/json' },
	body: JSON.stringify(body)
});

export function createDesign(
	body: { title?: string } & (
		{ width: number; height: number } | { sourceId: string } | { data: unknown }
	)
) {
	return request<{ id: string }>('/api/designs', jsonInit('POST', body));
}

export function saveDesign(id: string, body: { version: number; title?: string; data?: unknown }) {
	return request<{ version: number }>(`/api/designs/${id}`, jsonInit('PUT', body));
}

export function deleteDesign(id: string) {
	return request<void>(`/api/designs/${id}`, { method: 'DELETE' });
}

export function uploadThumbnail(id: string, jpeg: Blob) {
	return request<{ url: string }>(`/api/designs/${id}/thumbnail`, { method: 'PUT', body: jpeg });
}

export interface UploadedImage {
	id: string;
	url: string;
	width: number | null;
	height: number | null;
}

export function listUploads() {
	return request<UploadedImage[]>('/api/uploads');
}

export function uploadImage(
	file: Blob,
	meta: { width: number; height: number; kind?: 'upload' | 'bg_removed' }
) {
	const form = new FormData();
	form.set('file', file);
	form.set('width', String(meta.width));
	form.set('height', String(meta.height));
	if (meta.kind) form.set('kind', meta.kind);
	return request<UploadedImage>('/api/uploads', { method: 'POST', body: form });
}
