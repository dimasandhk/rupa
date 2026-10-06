<script lang="ts">
	import { LayoutGrid, Maximize, Minus, Plus, ScrollLayout, SlidesLayout } from '#lib/icons.ts';
	import { getEditor } from '../context';

	let {
		onzoom,
		onfit,
		ongrid
	}: { onzoom: (z: number) => void; onfit: () => void; ongrid: () => void } = $props();
	const editor = getEditor();

	const STEPS = [0.1, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 3, 4];
	function step(dir: 1 | -1) {
		const z = editor.zoom;
		const next =
			dir > 0 ? STEPS.find((s) => s > z + 0.001) : [...STEPS].reverse().find((s) => s < z - 0.001);
		if (next) onzoom(next);
	}

	const slides = $derived(editor.layout === 'slides');
</script>

<!-- Two pills: floating over the canvas in scroll layout, docked under the filmstrip in slides layout. -->
<div
	class="flex items-end justify-between gap-3 text-sm {slides
		? 'shrink-0 bg-paper/70 px-3 pb-3 backdrop-blur'
		: 'pointer-events-none absolute inset-x-3 bottom-3 z-20'}"
>
	<div
		class="pointer-events-auto flex h-10 items-center gap-1 rounded-xl bg-white/95 pr-1 pl-3 shadow-soft ring-1 ring-line backdrop-blur"
	>
		<span class="font-medium tabular-nums">
			Page {editor.activePageIndex + 1}
			<span class="text-muted">of {editor.data.pages.length}</span>
		</span>
		<span class="hidden px-1 text-xs text-muted tabular-nums sm:inline"
			>{editor.data.width} × {editor.data.height}</span
		>
		<button class="icon-btn size-8" title="All pages" onclick={ongrid}
			><LayoutGrid class="size-4" /></button
		>
		<button
			class="icon-btn size-8"
			title={slides ? 'Switch to scroll view' : 'Switch to slides view'}
			aria-label={slides ? 'Scroll view' : 'Slides view'}
			onclick={() => editor.setLayout(slides ? 'scroll' : 'slides')}
		>
			{#if slides}<ScrollLayout class="size-4" />{:else}<SlidesLayout class="size-4" />{/if}
		</button>
	</div>

	<div
		class="pointer-events-auto flex h-10 items-center gap-0.5 rounded-xl bg-white/95 px-1 shadow-soft ring-1 ring-line backdrop-blur"
	>
		<button class="icon-btn size-8" title="Zoom out (Ctrl -)" onclick={() => step(-1)}
			><Minus class="size-4" /></button
		>
		<button
			class="h-8 w-14 rounded-lg text-center font-medium tabular-nums transition hover:bg-ink/[0.05]"
			title="Fit to screen (Ctrl 0)"
			onclick={onfit}
		>
			{Math.round(editor.zoom * 100)}%
		</button>
		<button class="icon-btn size-8" title="Zoom in (Ctrl +)" onclick={() => step(1)}
			><Plus class="size-4" /></button
		>
		<div class="mx-0.5 h-5 w-px bg-line" aria-hidden="true"></div>
		<button class="icon-btn size-8" title="Fit to screen" onclick={onfit}
			><Maximize class="size-4" /></button
		>
	</div>
</div>
