import { apply, create } from 'mutative';
import { align, distribute, reorder, type Alignment, type ZOrder } from '../commands/arrange';
import { group, ungroup } from '../commands/group';
import { addPage, deletePage, duplicatePage, movePage } from '../commands/pages';
import { resizeDesign } from '../commands/scale';
import { cloneWithNewIds, createImage, deepClone, newId } from '../model/factory';
import { coverCrop, frameScreen } from '../model/frames';
import { elementBounds, rotate, unionBounds } from '../model/geometry';
import type { DesignData, Element, Page, PageTransition } from '../model/types';
import { History } from './history';

interface UiSnapshot {
	activePageIndex: number;
	selectedIds: string[];
}

interface UpdateOptions {
	/** Merge with the previous change if it had the same key (sliders, typing). */
	key?: string;
}

const CLIPBOARD_MARKER = 'dim-canva/elements';

export type EditorLayout = 'scroll' | 'slides';

/** A photo about to go into a frame. */
export interface FramePhoto {
	src: string;
	assetId?: string;
	naturalWidth: number;
	naturalHeight: number;
}

/** Landscape 16:9 and 4:3 designs are presentations: show them slide by slide. */
export function defaultLayout(data: { width: number; height: number }): EditorLayout {
	const r = data.width / data.height;
	return Math.abs(r - 16 / 9) < 0.02 || Math.abs(r - 4 / 3) < 0.02 ? 'slides' : 'scroll';
}

function readLayout(id: string): EditorLayout | undefined {
	try {
		const v =
			typeof localStorage === 'undefined' ? null : localStorage.getItem(`rupa:layout:${id}`);
		return v === 'slides' || v === 'scroll' ? v : undefined;
	} catch {
		return undefined;
	}
}

export class Editor {
	id: string;
	/** Server version this document is based on (optimistic concurrency). */
	version: number;
	title = $state('');
	data = $state.raw() as DesignData;
	activePageIndex = $state(0);
	selectedIds = $state.raw<string[]>([]);
	zoom = $state(1);
	editingTextId = $state<string | null>(null);
	/** Image currently in crop mode. */
	cropId = $state<string | null>(null);
	/** Whether ending crop mode should keep the new crop (false = cancel). */
	cropApply = true;
	/** Increments on every document change; drives autosave. */
	revision = $state(0);
	/** 'slides': one page + filmstrip (presentations); 'scroll': pages stacked vertically. */
	layout = $state<EditorLayout>('scroll');

	#history = new History<UiSnapshot>();
	#historyTick = $state(0);
	#clipboard: Element[] = [];

	constructor(init: { id: string; title: string; data: DesignData; version?: number }) {
		this.id = init.id;
		this.version = init.version ?? 1;
		this.title = init.title;
		this.data = init.data;
		this.layout = readLayout(init.id) ?? defaultLayout(init.data);
	}

	setLayout(layout: EditorLayout) {
		this.layout = layout;
		try {
			localStorage.setItem(`rupa:layout:${this.id}`, layout);
		} catch {
			// Storage unavailable (private mode): the choice just isn't remembered.
		}
	}

	renamePage(index: number, title: string) {
		const t = title.trim().slice(0, 200);
		this.update((d) => {
			if (!d.pages[index]) return;
			if (t) d.pages[index].title = t;
			else delete d.pages[index].title;
		});
	}

	/** Set (or with `null` clear) the transition played when moving onto a page. */
	setTransition(indexes: number[], transition: PageTransition | null) {
		this.update((d) => {
			for (const i of indexes) {
				const page = d.pages[i];
				if (!page) continue;
				if (transition) page.transition = { ...transition };
				else delete page.transition;
			}
		});
	}

	activePage: Page = $derived(this.data.pages[this.activePageIndex] ?? this.data.pages[0]);

	selectedElements: Element[] = $derived.by(() => {
		const set = new Set(this.selectedIds);
		return this.activePage.elements.filter((e) => set.has(e.id));
	});

	get canUndo() {
		void this.#historyTick;
		return this.#history.undoStack.length > 0;
	}

	get canRedo() {
		void this.#historyTick;
		return this.#history.redoStack.length > 0;
	}

	// ---------------------------------------------------------------- mutations

	update(recipe: (draft: DesignData) => void, opts: UpdateOptions = {}) {
		const before = { activePageIndex: this.activePageIndex, selectedIds: this.selectedIds };
		const [next, patches, inverse] = create(this.data, recipe, { enablePatches: true });
		if (!patches.length) return;
		this.data = next;
		this.#history.push({ patches, inverse, key: opts.key, time: Date.now(), before });
		this.#historyTick++;
		this.revision++;
	}

	/** Apply a change that should not be undoable (e.g. measured text height). */
	silentUpdate(recipe: (draft: DesignData) => void) {
		const next = create(this.data, recipe);
		if (next === this.data) return;
		this.data = next;
		this.revision++;
	}

	updatePage(recipe: (page: Page, draft: DesignData) => void, opts?: UpdateOptions) {
		const index = this.activePageIndex;
		this.update((d) => recipe(d.pages[index], d), opts);
	}

	updateElements(ids: string[], recipe: (el: Element) => void, opts?: UpdateOptions) {
		const set = new Set(ids);
		this.updatePage((page) => {
			for (const el of page.elements) if (set.has(el.id)) recipe(el);
		}, opts);
	}

	updateSelected(recipe: (el: Element) => void, opts?: UpdateOptions) {
		this.updateElements(this.selectedIds, recipe, opts);
	}

	/** Close the current merge window so the next keyed change becomes its own entry. */
	sealHistory() {
		this.#history.seal();
	}

	undo() {
		const entry = this.#history.popUndo();
		if (!entry) return;
		this.data = apply(this.data, entry.inverse);
		this.#restore(entry.before);
		this.#historyTick++;
		this.revision++;
	}

	redo() {
		const entry = this.#history.popRedo();
		if (!entry) return;
		this.data = apply(this.data, entry.patches);
		this.#historyTick++;
		this.revision++;
		this.#restore({ activePageIndex: this.activePageIndex, selectedIds: [] });
	}

	#restore(ui: UiSnapshot) {
		this.activePageIndex = Math.min(ui.activePageIndex, this.data.pages.length - 1);
		const ids = new Set(this.activePage.elements.map((e) => e.id));
		this.selectedIds = ui.selectedIds.filter((id) => ids.has(id));
		this.editingTextId = null;
	}

	// ---------------------------------------------------------------- selection

	select(ids: string[]) {
		this.selectedIds = ids;
	}

	toggleSelect(id: string) {
		this.selectedIds = this.selectedIds.includes(id)
			? this.selectedIds.filter((s) => s !== id)
			: [...this.selectedIds, id];
	}

	clearSelection() {
		if (this.selectedIds.length) this.selectedIds = [];
		this.editingTextId = null;
		this.endCrop(true);
	}

	startCrop(id: string) {
		const el = this.activePage.elements.find((e) => e.id === id);
		const croppable = el?.type === 'image' || (el?.type === 'frame' && !!el.image);
		if (!el || !croppable || el.locked) return;
		this.editingTextId = null;
		this.selectedIds = [id];
		this.cropApply = true;
		this.cropId = id;
	}

	endCrop(apply: boolean) {
		if (!this.cropId) return;
		this.cropApply = apply;
		this.cropId = null;
	}

	selectAll() {
		this.selectedIds = this.activePage.elements.filter((e) => !e.locked).map((e) => e.id);
	}

	setActivePage(index: number) {
		if (index === this.activePageIndex) return;
		this.activePageIndex = Math.max(0, Math.min(index, this.data.pages.length - 1));
		this.selectedIds = [];
		this.editingTextId = null;
		this.endCrop(true);
	}

	// ---------------------------------------------------------------- elements

	/**
	 * Add elements to the active page. Elements without an explicit position are
	 * scaled to fit and centered, like dropping something from Canva's side panel.
	 */
	addElements(
		els: Element[],
		opts: { center?: boolean; at?: { x: number; y: number } } = { center: true }
	) {
		const { width: W, height: H } = this.data;
		const placed = els.map((el) => {
			if (!opts.center && !opts.at) return el;
			const s = Math.min(1, (W * 0.8) / el.width, (H * 0.8) / el.height);
			const width = el.width * s;
			const height = el.height * s;
			// Centered on the page, or on a drop point.
			const cx = opts.at?.x ?? W / 2;
			const cy = opts.at?.y ?? H / 2;
			return { ...el, width, height, x: cx - width / 2, y: cy - height / 2 };
		});
		this.updatePage((page) => {
			page.elements.push(...placed);
		});
		this.selectedIds = placed.map((e) => e.id);
	}

	/**
	 * Put a photo into a frame (cover-cropped). When the photo came from an
	 * image element dragged onto the frame, that element is removed in the
	 * same step, so a single undo restores both.
	 */
	fillFrame(frameId: string, photo: FramePhoto, consumeId?: string) {
		this.updatePage((page) => {
			const frame = page.elements.find((e) => e.id === frameId);
			if (frame?.type !== 'frame') return;
			const screen = frameScreen(frame);
			frame.image = {
				src: photo.src,
				assetId: photo.assetId,
				naturalWidth: photo.naturalWidth,
				naturalHeight: photo.naturalHeight,
				crop: coverCrop(photo.naturalWidth, photo.naturalHeight, screen.width, screen.height)
			};
			if (consumeId) page.elements = page.elements.filter((e) => e.id !== consumeId);
		});
		this.selectedIds = [frameId];
	}

	/** Pull a frame's photo out as a standalone image, leaving the frame empty. */
	detachFrameImage(frameId: string) {
		const frame = this.activePage.elements.find((e) => e.id === frameId);
		if (frame?.type !== 'frame' || !frame.image) return;
		const screen = frameScreen(frame);
		const origin = rotate({ x: screen.x + 20, y: screen.y + 20 }, frame.rotation);
		const img = createImage(frame.image.src, frame.image.naturalWidth, frame.image.naturalHeight, {
			assetId: frame.image.assetId,
			crop: { ...frame.image.crop },
			x: frame.x + origin.x,
			y: frame.y + origin.y,
			width: screen.width,
			height: screen.height,
			rotation: frame.rotation
		});
		this.updatePage((page) => {
			const f = page.elements.find((e) => e.id === frameId);
			if (f?.type === 'frame') delete f.image;
			page.elements.push(img);
		});
		this.selectedIds = [img.id];
	}

	deleteSelected() {
		const set = new Set(this.selectedIds);
		if (!set.size) return;
		this.updatePage((page) => {
			page.elements = page.elements.filter((e) => !set.has(e.id) || e.locked);
		});
		this.selectedIds = [];
	}

	duplicateSelected() {
		const copies = this.selectedElements.map((el) => {
			const c = cloneWithNewIds(el);
			c.x += 20;
			c.y += 20;
			c.locked = false;
			return c;
		});
		if (!copies.length) return;
		this.addElements(copies, { center: false });
	}

	nudge(dx: number, dy: number) {
		this.updateSelected(
			(el) => {
				if (el.locked) return;
				el.x += dx;
				el.y += dy;
			},
			{ key: 'nudge' }
		);
	}

	align(a: Alignment) {
		const ids = this.selectedIds;
		const size = { width: this.data.width, height: this.data.height };
		this.updatePage((page) => align(page, ids, a, size));
	}

	distribute(axis: 'horizontal' | 'vertical') {
		const ids = this.selectedIds;
		this.updatePage((page) => distribute(page, ids, axis));
	}

	reorder(op: ZOrder) {
		const ids = this.selectedIds;
		this.updatePage((page) => reorder(page, ids, op));
	}

	groupSelected() {
		const ids = this.selectedIds;
		let gid: string | undefined;
		this.updatePage((page) => {
			gid = group(page, ids);
		});
		if (gid) this.selectedIds = [gid];
	}

	ungroupSelected() {
		const [id] = this.selectedIds;
		let children: string[] = [];
		this.updatePage((page) => {
			children = ungroup(page, id);
		});
		if (children.length) this.selectedIds = children;
	}

	toggleLock() {
		const lock = this.selectedElements.some((e) => !e.locked);
		this.updateSelected((el) => {
			el.locked = lock;
		});
	}

	flip(axis: 'x' | 'y') {
		this.updateSelected((el) => {
			if (axis === 'x') el.flipX = !el.flipX;
			else el.flipY = !el.flipY;
		});
	}

	selectionBounds() {
		const els = this.selectedElements;
		return els.length ? unionBounds(els.map((e) => elementBounds(e))) : null;
	}

	// ---------------------------------------------------------------- clipboard

	async copy() {
		const els = this.selectedElements.map((e) => deepClone(e));
		if (!els.length) return;
		this.#clipboard = els;
		try {
			await navigator.clipboard.writeText(JSON.stringify({ [CLIPBOARD_MARKER]: els }));
		} catch {
			// Clipboard permission denied: the in-memory copy still works within the tab.
		}
	}

	async cut() {
		await this.copy();
		this.deleteSelected();
	}

	/** Paste our own elements; returns false if the clipboard held something else. */
	pasteElements(text?: string): boolean {
		let els = this.#clipboard;
		if (text) {
			try {
				const parsed = JSON.parse(text);
				if (Array.isArray(parsed?.[CLIPBOARD_MARKER])) els = parsed[CLIPBOARD_MARKER];
				else return false;
			} catch {
				return false;
			}
		}
		if (!els.length) return false;
		const copies = els.map((el) => {
			const c = cloneWithNewIds(el);
			c.x += 20;
			c.y += 20;
			return c;
		});
		this.#clipboard = copies;
		this.addElements(copies, { center: false });
		return true;
	}

	// ---------------------------------------------------------------- pages

	addPage() {
		let index = 0;
		this.update((d) => {
			index = addPage(d, this.activePageIndex);
		});
		this.setActivePage(index);
	}

	duplicatePage(index = this.activePageIndex) {
		let next = 0;
		this.update((d) => {
			next = duplicatePage(d, index);
		});
		this.setActivePage(next);
	}

	deletePage(index = this.activePageIndex) {
		let next = 0;
		this.update((d) => {
			next = deletePage(d, index);
		});
		this.activePageIndex = -1;
		this.setActivePage(next);
	}

	movePage(from: number, to: number) {
		let next = from;
		this.update((d) => {
			next = movePage(d, from, to);
		});
		this.activePageIndex = next;
	}

	/**
	 * Insert pages (e.g. from a template) after the active page, scaled to this
	 * design's size. An empty active page is replaced, as in Canva.
	 */
	insertPages(source: DesignData) {
		const fitted = create(source, (d) => {
			resizeDesign(d, this.data.width, this.data.height);
			for (const p of d.pages) {
				p.id = newId();
				p.elements = p.elements.map(cloneWithNewIds);
			}
		});
		const at = this.activePageIndex;
		const replace = this.activePage.elements.length === 0;
		this.update((d) => {
			d.pages.splice(replace ? at : at + 1, replace ? 1 : 0, ...fitted.pages);
		});
		this.activePageIndex = -1;
		this.setActivePage(replace ? at : at + 1);
	}

	resize(width: number, height: number) {
		this.update((d) => resizeDesign(d, width, height));
	}
}
