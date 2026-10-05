import { untrack } from 'svelte';
import { saveDesign, uploadThumbnail } from '#lib/api.ts';
import { renderThumbnail } from '../canvas/export';
import type { Editor } from './editor.svelte';

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error' | 'conflict';

const DEBOUNCE = 1000;
const THUMBNAIL_EVERY = 8000;

/**
 * Persists the design shortly after each change. Must be created inside a
 * component (it registers effects). Saves are serialized, and the server's
 * version check turns concurrent edits from another tab into a conflict
 * instead of silently overwriting them.
 */
export class Autosave {
	status = $state<SaveStatus>('saved');
	error = $state<string | null>(null);

	#editor: Editor;
	#savedRevision: number;
	#savedTitle: string;
	#timer: ReturnType<typeof setTimeout> | undefined;
	#inflight: Promise<void> | undefined;
	#lastThumb = 0;
	#thumbTimer: ReturnType<typeof setTimeout> | undefined;

	constructor(editor: Editor) {
		this.#editor = editor;
		this.#savedRevision = editor.revision;
		this.#savedTitle = editor.title;

		$effect(() => {
			const dirty = editor.revision !== this.#savedRevision || editor.title !== this.#savedTitle;
			if (!dirty || untrack(() => this.status === 'conflict')) return;
			this.status = 'unsaved';
			clearTimeout(this.#timer);
			this.#timer = setTimeout(() => this.flush(), DEBOUNCE);
		});

		$effect(() => {
			const warn = (e: BeforeUnloadEvent) => {
				if (this.status !== 'saved') e.preventDefault();
			};
			window.addEventListener('beforeunload', warn);
			return () => {
				window.removeEventListener('beforeunload', warn);
				clearTimeout(this.#timer);
				clearTimeout(this.#thumbTimer);
			};
		});
	}

	/** Save now (also used before navigating away or exporting). */
	async flush(): Promise<void> {
		clearTimeout(this.#timer);
		if (this.#inflight) {
			await this.#inflight;
		}
		const ed = this.#editor;
		const revision = ed.revision;
		const title = ed.title.trim() || 'Untitled design';
		if (revision === this.#savedRevision && title === this.#savedTitle) {
			if (this.status === 'unsaved') this.status = 'saved';
			return;
		}
		const dataChanged = revision !== this.#savedRevision;
		this.status = 'saving';
		this.#inflight = (async () => {
			try {
				const res = await saveDesign(ed.id, {
					version: ed.version,
					title,
					...(dataChanged && { data: ed.data })
				});
				ed.version = res.version;
				this.#savedRevision = revision;
				this.#savedTitle = title;
				this.error = null;
				this.status =
					ed.revision === this.#savedRevision && ed.title.trim() === this.#savedTitle
						? 'saved'
						: 'unsaved';
				if (dataChanged) this.#scheduleThumbnail();
			} catch (err) {
				const e = err as Error & { status?: number };
				this.status = e.status === 409 ? 'conflict' : 'error';
				this.error = e.message;
				// Retry transient failures (network, server errors). A rejected save
				// (4xx) would fail the same way again, so wait for the next edit.
				const transient = !e.status || e.status >= 500;
				if (this.status === 'error' && transient)
					this.#timer = setTimeout(() => this.flush(), 5000);
			} finally {
				this.#inflight = undefined;
			}
		})();
		await this.#inflight;
		// Changes made while the request was in flight need another save.
		if ((this.status as SaveStatus) === 'unsaved')
			this.#timer = setTimeout(() => this.flush(), DEBOUNCE);
	}

	/** Resolve a conflict by saving this tab's version over the newer one. */
	async overwrite() {
		const res = await fetch(`/api/designs/${this.#editor.id}`);
		if (!res.ok) return;
		this.#editor.version = (await res.json()).version;
		this.#savedRevision = -1; // force the data to be sent
		this.status = 'unsaved';
		await this.flush();
	}

	#scheduleThumbnail() {
		clearTimeout(this.#thumbTimer);
		const wait = Math.max(500, THUMBNAIL_EVERY - (Date.now() - this.#lastThumb));
		this.#thumbTimer = setTimeout(async () => {
			this.#lastThumb = Date.now();
			try {
				const blob = await renderThumbnail(this.#editor.data);
				await uploadThumbnail(this.#editor.id, blob);
			} catch {
				// Thumbnails are best-effort.
			}
		}, wait);
	}
}
