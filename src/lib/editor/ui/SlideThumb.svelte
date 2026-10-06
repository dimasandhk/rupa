<script lang="ts" module>
	import type { Page } from '../model/types';

	// Rendered thumbnails keyed by page object. Pages are immutable snapshots, so
	// an unchanged page is never re-rendered; an edited page is a new object.
	const rendered = new WeakMap<Page, string>();
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import { renderPage } from '../canvas/export';
	import { getEditor } from '../context';

	let { page, index, height }: { page: Page; index: number; height: number } = $props();
	const editor = getEditor();

	let src = $state<string | undefined>();

	$effect(() => {
		const p = page;
		const cached = rendered.get(p);
		if (cached) {
			src = cached;
			return;
		}
		// Debounce while the slide is being edited; render the first time right away.
		const delay = untrack(() => src) ? 400 : 0;
		let cancelled = false;
		const timer = setTimeout(async () => {
			const data = untrack(() => editor.data);
			if (data.pages[index] !== p) return; // superseded by a newer edit
			const ratio = (height * 2) / data.height; // 2× for crisp thumbnails
			const canvas = await renderPage(data, index, { pixelRatio: ratio });
			const url = canvas.toDataURL('image/jpeg', 0.85);
			rendered.set(p, url);
			if (!cancelled) src = url;
		}, delay);
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	});
</script>

{#if src}
	<img {src} alt="" class="size-full object-cover" draggable="false" />
{:else}
	<div class="size-full animate-pulse bg-white"></div>
{/if}
