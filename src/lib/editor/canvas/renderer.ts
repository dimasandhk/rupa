import Konva from 'konva';
import type { Element, Page } from '../model/types';
import { konvaFill } from '../color/color';
import { onFontLoaded } from './fonts';
import { getImage } from './images';
import { buildElement } from './nodes';

interface Entry {
	el: Element;
	group: Konva.Group;
}

/**
 * Keeps a Konva layer in sync with a page's elements. Thanks to structural
 * sharing in the document, only elements whose object identity changed are
 * rebuilt.
 */
export class PageRenderer {
	readonly layer: Konva.Layer;
	readonly background: Konva.Rect;
	#bgImage: Konva.Image;
	#entries = new Map<string, Entry>();
	#hidden = new Set<string>();
	#page: Page | undefined;
	#unsubscribe: () => void;
	#onMeasured: (id: string, height: number) => void;
	#scheduled = false;

	constructor(
		layer: Konva.Layer,
		size: { width: number; height: number },
		opts: { onMeasured: (id: string, height: number) => void; interactive: boolean }
	) {
		this.layer = layer;
		this.#onMeasured = opts.onMeasured;
		this.background = new Konva.Rect({ ...size, fill: '#ffffff', name: 'background' });
		this.#bgImage = new Konva.Image({
			...size,
			image: undefined,
			listening: false,
			visible: false
		});
		layer.add(this.background, this.#bgImage);
		this.#unsubscribe = onFontLoaded(() => this.#rebuildWhere((el) => hasText(el)));
		if (!opts.interactive) layer.listening(false);
	}

	get(id: string) {
		return this.#entries.get(id)?.group;
	}

	setSize(width: number, height: number) {
		this.background.size({ width, height });
		this.#bgImage.size({ width, height });
	}

	sync(page: Page) {
		this.#page = page;
		const bg = page.background;
		const { width: bw, height: bh } = this.background.size();
		this.background.setAttrs(konvaFill(bg.color, bw, bh));
		const img = bg.image ? getImage(bg.image.src, () => this.#schedule()) : undefined;
		this.#bgImage.setAttrs({ image: img, visible: !!img });
		if (img) {
			// Cover-fit the background image.
			const { width: W, height: H } = this.background.size();
			const s = Math.max(W / img.width, H / img.height);
			const cw = W / s;
			const ch = H / s;
			this.#bgImage.crop({
				x: (img.width - cw) / 2,
				y: (img.height - ch) / 2,
				width: cw,
				height: ch
			});
		}

		const seen = new Set<string>();
		page.elements.forEach((el, i) => {
			seen.add(el.id);
			let entry = this.#entries.get(el.id);
			if (!entry) {
				const group = new Konva.Group({ id: el.id, name: 'element' });
				this.layer.add(group);
				entry = { el, group };
				this.#entries.set(el.id, entry);
				this.#build(entry, el);
			} else if (entry.el !== el) {
				this.#build(entry, el);
			}
			entry.group.zIndex(i + 2); // after background + background image
		});
		for (const [id, entry] of this.#entries) {
			if (!seen.has(id)) {
				entry.group.destroy();
				this.#entries.delete(id);
			}
		}
		this.layer.batchDraw();
	}

	#build(entry: Entry, el: Element) {
		entry.el = el;
		buildElement(entry.group, el, {
			invalidate: (id) => {
				const e = this.#entries.get(id);
				if (e) e.el = { ...e.el }; // force a rebuild on the next pass
				this.#schedule();
			},
			measured: (id, h) => this.#onMeasured(id, h)
		});
		entry.group.draggable(!el.locked);
		entry.group.visible(!this.#hidden.has(el.id));
	}

	#rebuildWhere(pred: (el: Element) => boolean) {
		for (const entry of this.#entries.values()) {
			if (pred(entry.el)) entry.el = { ...entry.el };
		}
		this.#schedule();
	}

	#schedule() {
		if (this.#scheduled) return;
		this.#scheduled = true;
		queueMicrotask(() => {
			this.#scheduled = false;
			// Entries whose `el` was replaced by a copy no longer match the page's
			// objects, so sync() rebuilds exactly those.
			if (this.#page) this.sync(this.#page);
		});
	}

	setHidden(id: string | null) {
		for (const hid of this.#hidden) this.get(hid)?.visible(true);
		this.#hidden.clear();
		if (id) {
			this.#hidden.add(id);
			this.get(id)?.visible(false);
		}
		this.layer.batchDraw();
	}

	destroy() {
		this.#unsubscribe();
		this.#entries.clear();
	}
}

function hasText(el: Element): boolean {
	return el.type === 'text' || (el.type === 'group' && el.children.some(hasText));
}
