<script lang="ts">
	import { CopyPlus, Plus, Trash2, X } from '@lucide/svelte';
	import { renderPage } from '../canvas/export';
	import { getEditor } from '../context';
	import type { Page } from '../model/types';

	let { onclose, onopen }: { onclose: () => void; onopen: (index: number) => void } = $props();
	const editor = getEditor();

	// Thumbnails cached by page object identity: unchanged pages are not re-rendered.
	const cache = new WeakMap<Page, Promise<string>>();
	function thumb(index: number): Promise<string> {
		const page = editor.data.pages[index];
		let p = cache.get(page);
		if (!p) {
			const ratio = 260 / Math.max(editor.data.width, editor.data.height);
			p = renderPage(editor.data, index, { pixelRatio: ratio }).then((c) =>
				c.toDataURL('image/jpeg', 0.8)
			);
			cache.set(page, p);
		}
		return p;
	}

	let dragFrom = $state<number | null>(null);
	let dragOver = $state<number | null>(null);
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose()} />

<div class="fixed inset-0 z-40 flex flex-col bg-canvas" role="dialog" aria-label="Page grid">
	<header class="flex h-14 items-center border-b border-line bg-white px-4">
		<h2 class="font-semibold">{editor.data.pages.length} pages</h2>
		<span class="ml-3 text-sm text-muted">Drag to reorder · click to open</span>
		<button class="ml-auto icon-btn" onclick={onclose} aria-label="Close grid view"
			><X class="size-5" /></button
		>
	</header>
	<div class="flex-1 overflow-y-auto p-8">
		<div class="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6">
			{#each editor.data.pages as page, i (page.id)}
				<div
					class="group"
					role="listitem"
					draggable="true"
					ondragstart={() => (dragFrom = i)}
					ondragover={(e) => {
						e.preventDefault();
						dragOver = i;
					}}
					ondragend={() => {
						dragFrom = dragOver = null;
					}}
					ondrop={(e) => {
						e.preventDefault();
						if (dragFrom !== null && dragFrom !== i) editor.movePage(dragFrom, i);
						dragFrom = dragOver = null;
					}}
				>
					<button
						class="relative grid w-full place-items-center rounded-lg bg-white p-2 shadow-sm transition hover:ring-2 hover:ring-brand"
						class:ring-2={editor.activePageIndex === i || dragOver === i}
						class:ring-brand={editor.activePageIndex === i || dragOver === i}
						class:opacity-40={dragFrom === i}
						style:aspect-ratio="{editor.data.width}/{editor.data.height}"
						onclick={() => onopen(i)}
					>
						{#await thumb(i)}
							<div class="size-full animate-pulse rounded bg-gray-100"></div>
						{:then src}
							<img {src} alt="Page {i + 1}" class="max-h-full max-w-full" draggable="false" />
						{/await}
					</button>
					<div class="mt-1.5 flex items-center text-sm">
						<span class="font-medium">{i + 1}</span>
						<button
							class="ml-auto icon-btn size-7 opacity-0 group-hover:opacity-100"
							title="Duplicate page"
							onclick={() => editor.duplicatePage(i)}><CopyPlus class="size-4" /></button
						>
						<button
							class="icon-btn size-7 opacity-0 group-hover:opacity-100"
							title="Delete page"
							disabled={editor.data.pages.length === 1}
							onclick={() => editor.deletePage(i)}><Trash2 class="size-4" /></button
						>
					</div>
				</div>
			{/each}
			<button
				class="grid place-items-center rounded-lg border-2 border-dashed border-gray-300 text-muted hover:border-brand hover:text-brand"
				style:aspect-ratio="{editor.data.width}/{editor.data.height}"
				onclick={() => {
					editor.setActivePage(editor.data.pages.length - 1);
					editor.addPage();
				}}
				aria-label="Add page"><Plus class="size-8" /></button
			>
		</div>
	</div>
</div>
