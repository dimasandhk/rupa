<script lang="ts">
	import { ChevronDown, ChevronUp, CopyPlus, FilePlus2, Trash2 } from '#lib/icons.ts';
	import { tick } from 'svelte';
	import PageCanvas from '../canvas/PageCanvas.svelte';
	import { getEditor } from '../context';
	import { addImageFile } from '../insert';

	let {
		oncontextmenu,
		onerror
	}: {
		oncontextmenu: (e: { x: number; y: number }) => void;
		onerror: (message: string) => void;
	} = $props();

	const editor = getEditor();
	let scroller: HTMLDivElement;
	let viewW = $state(0);
	let viewH = $state(0);
	let fitted = false;

	const MIN_ZOOM = 0.1;
	const MAX_ZOOM = 4;

	export function fitZoom() {
		const z = Math.min((viewW - 96) / editor.data.width, (viewH - 200) / editor.data.height);
		return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
	}

	export function zoomToFit() {
		editor.zoom = fitZoom();
	}

	export function zoomBy(factor: number) {
		setZoom(editor.zoom * factor);
	}

	/** Zoom while keeping the point under `anchor` (client coords) in place. */
	export function setZoom(z: number, anchor?: { x: number; y: number }) {
		const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
		const rect = scroller.getBoundingClientRect();
		const ax = (anchor?.x ?? rect.left + rect.width / 2) - rect.left;
		const ay = (anchor?.y ?? rect.top + rect.height / 2) - rect.top;
		const ratio = next / editor.zoom;
		const left = (scroller.scrollLeft + ax) * ratio - ax;
		const top = (scroller.scrollTop + ay) * ratio - ay;
		editor.zoom = next;
		tick().then(() => scroller.scrollTo({ left, top }));
	}

	export async function scrollToPage(index: number) {
		await tick();
		scroller
			.querySelector(`[data-page-index="${index}"]`)
			?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
	}

	$effect(() => {
		if (!fitted && viewW > 0 && viewH > 0) {
			fitted = true;
			zoomToFit();
		}
	});

	// Keep the active page in view when it changes from elsewhere (templates, undo, page grid).
	$effect(() => {
		const i = editor.activePageIndex;
		tick().then(() =>
			scroller
				.querySelector(`[data-page-index="${i}"]`)
				?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
		);
	});

	// Ctrl/⌘ + wheel zooms (needs a non-passive listener to stop browser zoom).
	$effect(() => {
		const onWheel = (e: WheelEvent) => {
			if (!e.ctrlKey && !e.metaKey) return;
			e.preventDefault();
			setZoom(editor.zoom * Math.exp(-e.deltaY * 0.002), { x: e.clientX, y: e.clientY });
		};
		scroller.addEventListener('wheel', onWheel, { passive: false });
		return () => scroller.removeEventListener('wheel', onWheel);
	});

	async function onDrop(e: DragEvent) {
		const files = [...(e.dataTransfer?.files ?? [])].filter((f) => f.type.startsWith('image/'));
		if (!files.length) return;
		e.preventDefault();
		for (const f of files) {
			try {
				await addImageFile(editor, f);
			} catch (err) {
				onerror((err as Error).message);
			}
		}
	}

	const pageCount = $derived(editor.data.pages.length);
</script>

<div
	bind:this={scroller}
	bind:clientWidth={viewW}
	bind:clientHeight={viewH}
	class="relative min-h-0 flex-1 overflow-auto"
	role="presentation"
	onpointerdown={(e) => {
		if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.workspaceBg !== undefined)
			editor.clearSelection();
	}}
	ondragover={(e) => e.preventDefault()}
	ondrop={onDrop}
>
	<!-- Extra top/bottom room so the floating toolbar and zoom pills never cover a page. -->
	<div class="flex min-w-max flex-col items-center gap-8 px-12 pt-20 pb-24" data-workspace-bg>
		{#each editor.data.pages as page, i (page.id)}
			{@const active = editor.activePageIndex === i}
			<section data-page-index={i} data-workspace-bg class="group/page">
				<header class="mb-2 flex h-8 items-center gap-0.5 text-sm" data-workspace-bg>
					<span class="mr-auto font-medium transition {active ? 'text-ink' : 'text-muted'}">
						Page {i + 1}
					</span>
					<div
						class="flex items-center gap-0.5 transition-opacity duration-200 {active
							? 'opacity-100'
							: 'opacity-0 group-hover/page:opacity-100 focus-within:opacity-100'}"
					>
						<button
							class="icon-btn size-7"
							title="Move page up"
							disabled={i === 0}
							onclick={() => editor.movePage(i, i - 1)}><ChevronUp class="size-4" /></button
						>
						<button
							class="icon-btn size-7"
							title="Move page down"
							disabled={i === pageCount - 1}
							onclick={() => editor.movePage(i, i + 1)}><ChevronDown class="size-4" /></button
						>
						<button
							class="icon-btn size-7"
							title="Duplicate page"
							onclick={() => editor.duplicatePage(i)}><CopyPlus class="size-4" /></button
						>
						<button
							class="icon-btn size-7"
							title="Delete page"
							disabled={pageCount === 1}
							onclick={() => editor.deletePage(i)}><Trash2 class="size-4" /></button
						>
						<button
							class="icon-btn size-7"
							title="Add page"
							onclick={() => {
								editor.setActivePage(i);
								editor.addPage();
								scrollToPage(i + 1);
							}}><FilePlus2 class="size-4" /></button
						>
					</div>
				</header>
				<div
					class="bg-white shadow-page transition duration-200 {active && pageCount > 1
						? 'ring-2 ring-brand/70 ring-offset-4 ring-offset-canvas'
						: ''}"
				>
					<PageCanvas index={i} {oncontextmenu} />
				</div>
			</section>
		{/each}
		<button
			class="btn h-12 rounded-xl border border-dashed border-ink/20 text-muted hover:border-brand hover:bg-white/60 hover:text-brand"
			style:width="{Math.max(240, editor.data.width * editor.zoom)}px"
			onclick={() => {
				editor.setActivePage(pageCount - 1);
				editor.addPage();
				scrollToPage(pageCount);
			}}
		>
			<FilePlus2 class="size-4" /> Add page
		</button>
	</div>
</div>
