<script lang="ts">
	import { goto } from '$app/navigation';
	import { tick } from 'svelte';
	import { playTransition } from '#lib/editor/canvas/transitions.ts';
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

	// Two stacked layers: `front` is the current slide, `back` the one leaving during a transition.
	let frontSrc = $state('');
	let backSrc = $state('');
	let frontEl = $state<HTMLImageElement>();
	let backEl = $state<HTMLImageElement>();
	let veilEl = $state<HTMLDivElement>();
	let running: Animation[] = [];
	let navToken = 0;
	/** Index the front layer is actually showing (`index` leads it while navigating). */
	let shown = -1;
	let navigating = false;

	function settle() {
		for (const a of running) a.cancel();
		running = [];
		backSrc = '';
	}

	// (Re)paint the current slide, e.g. on first load or when the window is resized.
	$effect(() => {
		if (!viewW) return;
		const i = index;
		slide(i).then((src) => {
			if (navigating) return;
			frontSrc = src;
			shown = i;
		});
	});

	async function navigate(target: number) {
		const to = Math.max(0, Math.min(count - 1, target));
		if (to === index) return;
		const from = shown < 0 ? index : shown;
		const token = ++navToken;
		navigating = true;
		index = to;
		const reverse = to < from;
		const t = data.data.pages[reverse ? from : to].transition;
		const src = await slide(to);
		if (token !== navToken) return;
		settle();
		const animate = t && t.type !== 'none' && Math.abs(to - from) === 1 && frontSrc && shown >= 0;
		if (!animate) {
			frontSrc = src;
			shown = to;
			navigating = false;
			return;
		}
		backSrc = frontSrc;
		frontSrc = src;
		shown = to;
		await tick();
		if (token !== navToken) return;
		if (!frontEl || !backEl || !veilEl) {
			navigating = false;
			return;
		}
		// Keep the new slide hidden until both images are decoded, or it pops in un-animated.
		frontEl.style.visibility = 'hidden';
		await Promise.all([frontEl.decode(), backEl.decode()]).catch(() => {});
		if (token !== navToken || !frontEl || !backEl || !veilEl) return;
		frontEl.style.visibility = '';
		running = playTransition(t, { incoming: frontEl, outgoing: backEl, veil: veilEl }, reverse);
		const done = () => {
			if (token !== navToken) return;
			settle();
			navigating = false;
		};
		Promise.all(running.map((a) => a.finished)).then(done, done);
	}

	// Pre-render the next slide so advancing is instant.
	$effect(() => {
		if (viewW && index + 1 < count) slide(index + 1);
	});

	const go = (d: number) => navigate(index + d);
	const exit = () => {
		if (document.fullscreenElement) document.exitFullscreen();
		goto(`/design/${data.id}`);
	};
	const fullscreen = () => document.documentElement.requestFullscreen?.().catch(() => {});

	function onKey(e: KeyboardEvent) {
		if (['ArrowRight', 'ArrowDown', ' ', 'PageDown', 'Enter'].includes(e.key)) go(1);
		else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) go(-1);
		else if (e.key === 'Home') navigate(0);
		else if (e.key === 'End') navigate(count - 1);
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
		<div
			class="relative overflow-hidden"
			style:width="{data.data.width * fit}px"
			style:height="{data.data.height * fit}px"
		>
			{#if backSrc}
				<img
					bind:this={backEl}
					src={backSrc}
					alt=""
					class="absolute inset-0 size-full"
					draggable="false"
				/>
			{/if}
			{#if frontSrc}
				<img
					bind:this={frontEl}
					src={frontSrc}
					alt="Slide {index + 1}"
					class="absolute inset-0 size-full"
					draggable="false"
				/>
			{/if}
			<div bind:this={veilEl} class="pointer-events-none absolute inset-0 bg-ink opacity-0"></div>
		</div>
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
