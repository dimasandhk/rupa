<script lang="ts">
	import { goto } from '$app/navigation';
	import { renderPage } from '#lib/editor/canvas/export.ts';
	import { ChevronLeft, ChevronRight, Maximize, X } from '#lib/icons.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let index = $state(0);
	let viewW = $state(0);
	let viewH = $state(0);
	let idle = $state(false);
	let idleTimer: ReturnType<typeof setTimeout>;
	const count = $derived(data.data.pages.length);
	const fit = $derived(Math.min(viewW / data.data.width, viewH / data.data.height));

	// Render at screen resolution; cache by page + size.
	const cache = new Map<string, Promise<string>>();
	function slide(i: number): Promise<string> {
		const ratio =
			Math.min(viewW / data.data.width, viewH / data.data.height) * (window.devicePixelRatio || 1);
		const key = `${i}@${ratio.toFixed(3)}`;
		let p = cache.get(key);
		if (!p) {
			p = renderPage(data.data, i, { pixelRatio: ratio }).then((c) => c.toDataURL('image/png'));
			cache.set(key, p);
		}
		return p;
	}

	// Pre-render the next slide so advancing is instant.
	$effect(() => {
		if (viewW && index + 1 < count) slide(index + 1);
	});

	const go = (d: number) => (index = Math.max(0, Math.min(count - 1, index + d)));
	const exit = () => {
		if (document.fullscreenElement) document.exitFullscreen();
		goto(`/design/${data.id}`);
	};
	const fullscreen = () => document.documentElement.requestFullscreen?.().catch(() => {});

	function onKey(e: KeyboardEvent) {
		if (['ArrowRight', 'ArrowDown', ' ', 'PageDown', 'Enter'].includes(e.key)) go(1);
		else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) go(-1);
		else if (e.key === 'Home') index = 0;
		else if (e.key === 'End') index = count - 1;
		else if (e.key === 'f') fullscreen();
		else if (e.key === 'Escape' && !document.fullscreenElement) exit();
		else return;
		e.preventDefault();
	}

	function wake() {
		idle = false;
		clearTimeout(idleTimer);
		idleTimer = setTimeout(() => (idle = true), 2500);
	}
</script>

<svelte:head><title>{data.title} · Present</title></svelte:head>
<svelte:window onkeydown={onKey} onpointermove={wake} />

<div
	class="fixed inset-0 grid place-items-center bg-black select-none"
	class:cursor-none={idle}
	bind:clientWidth={viewW}
	bind:clientHeight={viewH}
	role="presentation"
	onclick={(e) => go(e.clientX < viewW / 3 ? -1 : 1)}
>
	{#if viewW}
		{#await slide(index) then src}
			<img
				{src}
				alt="Slide {index + 1}"
				style:width="{data.data.width * fit}px"
				style:height="{data.data.height * fit}px"
				draggable="false"
			/>
		{/await}
	{/if}
</div>

<div
	class="fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white/10 p-1 text-white backdrop-blur transition-opacity"
	class:opacity-0={idle}
>
	<button
		class="icon-btn hover:bg-white/15"
		aria-label="Previous"
		onclick={() => go(-1)}
		disabled={index === 0}><ChevronLeft class="size-5" /></button
	>
	<span class="px-2 text-sm tabular-nums">{index + 1} / {count}</span>
	<button
		class="icon-btn hover:bg-white/15"
		aria-label="Next"
		onclick={() => go(1)}
		disabled={index === count - 1}><ChevronRight class="size-5" /></button
	>
	<button
		class="icon-btn hover:bg-white/15"
		aria-label="Fullscreen (F)"
		title="Fullscreen (F)"
		onclick={fullscreen}><Maximize class="size-4" /></button
	>
	<button
		class="icon-btn hover:bg-white/15"
		aria-label="Exit (Esc)"
		title="Exit (Esc)"
		onclick={exit}><X class="size-4" /></button
	>
</div>
