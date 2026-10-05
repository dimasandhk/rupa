<script lang="ts">
	import Konva from 'konva';
	import { untrack } from 'svelte';
	import { scaleSize } from '../commands/scale';
	import { getEditor } from '../context';
	import { intersects, type Rect } from '../model/geometry';
	import type { Element, Page } from '../model/types';
	import { startCrop, type CropSession } from './crop';
	import { getImage } from './images';
	import { PageRenderer } from './renderer';
	import { snap, type Guide } from './snapping';
	import TextEditorOverlay from './TextEditorOverlay.svelte';

	let {
		index,
		oncontextmenu
	}: {
		index: number;
		oncontextmenu?: (e: { x: number; y: number }) => void;
	} = $props();

	const editor = getEditor();
	const BRAND = '#8b3dff';

	const page = $derived(editor.data.pages[index]);
	const active = $derived(editor.activePageIndex === index);
	const W = $derived(editor.data.width);
	const H = $derived(editor.data.height);
	const editingText = $derived.by(() => {
		if (!active || !editor.editingTextId) return undefined;
		const el = page.elements.find((e) => e.id === editor.editingTextId);
		return el?.type === 'text' ? el : undefined;
	});

	let container: HTMLDivElement;
	let ready = $state(false);
	let stage: Konva.Stage;
	let contentLayer: Konva.Layer;
	let uiLayer: Konva.Layer;
	let renderer: PageRenderer;
	let tr: Konva.Transformer;
	let hover: Konva.Rect;
	let marquee: Konva.Rect;
	let guides: Konva.Group;
	let crop: CropSession | undefined;

	// ------------------------------------------------------------ helpers

	const findEl = (p: Page, id: string) => p.elements.find((e) => e.id === id);

	/** The top-level element group a Konva event target belongs to. */
	function elementNode(target: Konva.Node): Konva.Group | undefined {
		let n: Konva.Node | null = target;
		while (n && n.getParent() !== contentLayer) n = n.getParent();
		return n?.hasName('element') ? (n as Konva.Group) : undefined;
	}

	function isTransformerPart(target: Konva.Node) {
		let n: Konva.Node | null = target;
		while (n) {
			if (n === tr) return true;
			n = n.getParent();
		}
		return false;
	}

	function rectOf(node: Konva.Node): Rect {
		return node.getClientRect({ relativeTo: contentLayer, skipShadow: true, skipStroke: true });
	}

	// Text heights reported by the renderer are applied in one silent batch.
	const pendingHeights = new Map<string, number>();
	function onMeasured(id: string, height: number) {
		pendingHeights.set(id, height);
		if (pendingHeights.size > 1) return;
		queueMicrotask(() => {
			const updates = new Map(pendingHeights);
			pendingHeights.clear();
			const visit = (els: Element[]) => {
				for (const el of els) {
					const h = updates.get(el.id);
					if (h !== undefined && Math.abs(el.height - h) > 0.5) el.height = h;
					if (el.type === 'group') visit(el.children);
				}
			};
			const i = index;
			editor.silentUpdate((d) => d.pages[i] && visit(d.pages[i].elements));
		});
	}

	function drawGuides(list: Guide[]) {
		guides.destroyChildren();
		const z = stage.scaleX();
		for (const g of list) {
			guides.add(
				new Konva.Line({
					points: g.orientation === 'V' ? [g.pos, 0, g.pos, H] : [0, g.pos, W, g.pos],
					stroke: '#ff3dae',
					strokeWidth: 1 / z,
					dash: [4 / z, 4 / z],
					listening: false
				})
			);
		}
		uiLayer.batchDraw();
	}

	function showHover(id: string | null) {
		const el = id && !editor.selectedIds.includes(id) ? findEl(page, id) : undefined;
		if (!el) {
			hover.visible(false);
		} else {
			hover.setAttrs({
				x: el.x,
				y: el.y,
				width: el.width,
				height: el.height,
				rotation: el.rotation,
				strokeWidth: 2 / stage.scaleX(),
				visible: true
			});
		}
		uiLayer.batchDraw();
	}

	// ------------------------------------------------------------ setup

	$effect(() => untrack(setup));

	function setup() {
		const z = editor.zoom;
		stage = new Konva.Stage({ container, width: W * z, height: H * z, scaleX: z, scaleY: z });
		contentLayer = new Konva.Layer();
		uiLayer = new Konva.Layer();
		stage.add(contentLayer, uiLayer);
		renderer = new PageRenderer(
			contentLayer,
			{ width: W, height: H },
			{ onMeasured, interactive: true }
		);

		hover = new Konva.Rect({ stroke: BRAND, listening: false, visible: false });
		marquee = new Konva.Rect({
			fill: 'rgba(139,61,255,0.08)',
			stroke: BRAND,
			listening: false,
			visible: false
		});
		guides = new Konva.Group({ listening: false });
		tr = new Konva.Transformer({
			borderStroke: BRAND,
			borderStrokeWidth: 1.5,
			anchorStroke: '#c7c7d1',
			anchorFill: '#ffffff',
			anchorSize: 12,
			anchorCornerRadius: 6,
			rotateAnchorOffset: 28,
			rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315],
			rotationSnapTolerance: 4,
			ignoreStroke: true,
			flipEnabled: false,
			boundBoxFunc: (oldBox, newBox) =>
				Math.abs(newBox.width) < 8 || Math.abs(newBox.height) < 4 ? oldBox : newBox
		});
		uiLayer.add(hover, guides, tr, marquee);
		wireEvents();
		ready = true;
		return () => {
			ready = false;
			renderer.destroy();
			stage.destroy();
		};
	}

	// Zoom / design size
	$effect(() => {
		if (!ready) return;
		const z = editor.zoom;
		stage.size({ width: W * z, height: H * z });
		stage.scale({ x: z, y: z });
		renderer.setSize(W, H);
		tr.forceUpdate();
	});

	// Document -> canvas
	$effect(() => {
		if (!ready || !page) return;
		renderer.sync(page);
		tr.forceUpdate();
		uiLayer.batchDraw();
	});

	// Selection -> transformer
	$effect(() => {
		if (!ready) return;
		void page; // groups are recreated when elements are re-added (e.g. undo)
		const ids = active ? editor.selectedIds : [];
		const els = ids.map((id) => findEl(page, id)).filter((e): e is Element => !!e);
		const nodes = els
			.filter((e) => e.id !== editor.editingTextId && e.id !== editor.cropId)
			.map((e) => renderer.get(e.id))
			.filter((n): n is Konva.Group => !!n);
		const single = els.length === 1 ? els[0] : undefined;
		const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
		const sides = ['middle-left', 'middle-right'];
		let anchors = corners;
		if (single?.type === 'text') anchors = [...corners, ...sides];
		else if (single?.type === 'line') anchors = sides;
		else if (single?.type === 'shape')
			anchors = [...corners, ...sides, 'top-center', 'bottom-center'];
		const locked = els.some((e) => e.locked);
		tr.setAttrs({
			enabledAnchors: locked ? [] : anchors,
			rotateEnabled: !locked,
			keepRatio: single?.type !== 'shape',
			shouldOverdrawWholeArea: els.length > 1
		});
		tr.nodes(nodes);
		hover.visible(false);
		uiLayer.batchDraw();
	});

	// Hide the Konva text while its HTML editor is open
	$effect(() => {
		if (!ready) return;
		renderer.setHidden(editingText?.id ?? (active ? editor.cropId : null));
	});

	// Crop mode: one session per image; leaving crop mode applies (or cancels) it.
	$effect(() => {
		if (!ready || !active || !editor.cropId) return;
		const id = editor.cropId;
		const el = untrack(() => findEl(page, id));
		const img = el?.type === 'image' ? getImage(el.src) : undefined;
		if (el?.type !== 'image' || !img) {
			editor.cropId = null;
			return;
		}
		const i = index;
		crop = startCrop(uiLayer, el, img, () => {});
		return () => {
			const result = crop!.result();
			crop!.destroy();
			crop = undefined;
			if (!editor.cropApply) return;
			editor.update((d) => {
				const target = findEl(d.pages[i], id);
				if (target?.type !== 'image') return;
				Object.assign(target, {
					x: result.x,
					y: result.y,
					width: result.width,
					height: result.height,
					crop: result.crop
				});
			});
		};
	});

	// ------------------------------------------------------------ interaction

	function wireEvents() {
		let marqueeStart: { x: number; y: number } | null = null;
		let snapTargets: Rect[] = [];

		stage.on('mousedown touchstart', (e) => {
			editor.setActivePage(index);
			if (crop?.owns(e.target)) return;
			if (editor.cropId) editor.endCrop(true);
			if (isTransformerPart(e.target)) return;
			const node = elementNode(e.target);
			const shift = 'shiftKey' in e.evt && e.evt.shiftKey;
			if (!node) {
				if (!shift) editor.clearSelection();
				const p = stage.getRelativePointerPosition();
				if (p) {
					marqueeStart = p;
					marquee.setAttrs({ ...p, width: 0, height: 0, strokeWidth: 1 / stage.scaleX() });
				}
				return;
			}
			const id = node.id();
			if (shift) editor.toggleSelect(id);
			else if (!editor.selectedIds.includes(id)) editor.select([id]);
			if (editor.editingTextId && editor.editingTextId !== id) editor.editingTextId = null;
		});

		stage.on('mousemove touchmove', () => {
			if (!marqueeStart) return;
			const p = stage.getRelativePointerPosition();
			if (!p) return;
			marquee.setAttrs({
				x: Math.min(p.x, marqueeStart.x),
				y: Math.min(p.y, marqueeStart.y),
				width: Math.abs(p.x - marqueeStart.x),
				height: Math.abs(p.y - marqueeStart.y),
				visible: true
			});
			uiLayer.batchDraw();
		});

		const endMarquee = () => {
			if (!marqueeStart) return;
			marqueeStart = null;
			if (marquee.visible() && marquee.width() > 2) {
				const box = {
					x: marquee.x(),
					y: marquee.y(),
					width: marquee.width(),
					height: marquee.height()
				};
				const hits = page.elements
					.filter((el) => !el.locked)
					.filter((el) => {
						const n = renderer.get(el.id);
						return n && intersects(rectOf(n), box);
					})
					.map((el) => el.id);
				editor.select(hits);
			}
			marquee.visible(false);
			uiLayer.batchDraw();
		};
		stage.on('mouseup touchend', endMarquee);
		window.addEventListener('mouseup', endMarquee);
		stage.on('destroy', () => window.removeEventListener('mouseup', endMarquee));

		stage.on('mouseover', (e) => {
			const node = elementNode(e.target);
			showHover(node ? node.id() : null);
		});
		stage.on('mouseleave', () => showHover(null));

		stage.on('dblclick dbltap', (e) => {
			const node = elementNode(e.target);
			if (!node) return;
			const el = findEl(page, node.id());
			if (el?.type === 'text' && !el.locked) {
				editor.select([el.id]);
				editor.editingTextId = el.id;
			} else if (el?.type === 'image') {
				editor.startCrop(el.id);
			}
		});

		stage.on('contextmenu', (e) => {
			e.evt.preventDefault();
			const node = elementNode(e.target);
			if (node && !editor.selectedIds.includes(node.id())) editor.select([node.id()]);
			oncontextmenu?.({ x: e.evt.clientX, y: e.evt.clientY });
		});

		// ---- dragging + snapping
		contentLayer.on('dragstart', (e) => {
			if (!e.target.hasName('element')) return;
			hover.visible(false);
			const moving = new Set(tr.nodes().length ? tr.nodes() : [e.target]);
			snapTargets = page.elements
				.map((el) => renderer.get(el.id))
				.filter((n): n is Konva.Group => !!n && !moving.has(n) && n.visible())
				.map(rectOf);
		});

		contentLayer.on('dragmove', (e) => {
			const node = e.target;
			if (!node.hasName('element') || tr.nodes().length > 1) return;
			const r = snap(rectOf(node), snapTargets, { width: W, height: H }, 6 / stage.scaleX());
			node.position({ x: node.x() + r.dx, y: node.y() + r.dy });
			drawGuides(r.guides);
		});

		contentLayer.on('dragend', (e) => {
			const target = e.target;
			if (!target.hasName('element')) return;
			drawGuides([]);
			const nodes = tr.nodes().includes(target) ? tr.nodes() : [target];
			const i = index;
			editor.update((d) => {
				for (const n of nodes) {
					const el = findEl(d.pages[i], n.id());
					if (!el) continue;
					el.x = n.x();
					el.y = n.y();
				}
			});
		});

		// ---- transforming
		tr.on('transform', () => {
			const anchor = tr.getActiveAnchor();
			if (anchor !== 'middle-left' && anchor !== 'middle-right') return;
			// Side handles on text reflow the paragraph instead of stretching glyphs.
			for (const n of tr.nodes() as Konva.Group[]) {
				const el = findEl(page, n.id());
				if (el?.type !== 'text') continue;
				const width = Math.max(20, n.width() * n.scaleX());
				n.setAttrs({ width, scaleX: 1 });
				n.findOne('.hitbox')?.width(width);
				n.findOne('.text')?.width(width);
			}
		});

		tr.on('transformend', () => {
			const anchor = tr.getActiveAnchor();
			const corner = !anchor?.startsWith('middle') && !anchor?.endsWith('center');
			const i = index;
			const nodes = tr.nodes();
			editor.update((d) => {
				for (const n of nodes) {
					const el = findEl(d.pages[i], n.id());
					if (!el) continue;
					const sx = n.scaleX();
					const sy = n.scaleY();
					el.x = n.x();
					el.y = n.y();
					el.rotation = Math.round(n.rotation() * 100) / 100;
					if (el.type === 'text') {
						if (corner && anchor !== 'rotater') scaleSize(el, sx);
						else el.width = n.width() * sx;
					} else if (el.type === 'group' || (corner && el.type !== 'shape' && el.type !== 'line')) {
						scaleSize(el, sx);
					} else {
						el.width *= sx;
						el.height *= sy;
					}
					n.scale({ x: 1, y: 1 });
				}
			});
		});
	}

	function commitText(id: string, text: string) {
		if (editor.editingTextId === id) editor.editingTextId = null;
		const el = findEl(editor.data.pages[index], id);
		if (el?.type !== 'text') return;
		if (!text.trim()) {
			editor.updatePage((p) => {
				p.elements = p.elements.filter((e) => e.id !== id);
			});
			editor.select(editor.selectedIds.filter((s) => s !== id));
		} else if (text !== el.text) {
			editor.updateElements([id], (e) => {
				if (e.type === 'text') e.text = text;
			});
		}
	}
</script>

<div class="relative" style:width="{W * editor.zoom}px" style:height="{H * editor.zoom}px">
	<div bind:this={container}></div>
	{#if editingText}
		{#key editingText.id}
			{@const id = editingText.id}
			<TextEditorOverlay
				el={editingText}
				zoom={editor.zoom}
				oncommit={(text) => commitText(id, text)}
			/>
		{/key}
	{/if}
</div>
