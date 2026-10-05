<script lang="ts">
	import { LayoutGrid, Maximize } from '@lucide/svelte';
	import { getEditor } from '../context';

	let {
		onzoom,
		onfit,
		ongrid
	}: { onzoom: (z: number) => void; onfit: () => void; ongrid: () => void } = $props();
	const editor = getEditor();

	// Slider is logarithmic so 10%–400% feels even.
	const toSlider = (z: number) => Math.log(z);
	const fromSlider = (v: number) => Math.exp(v);
</script>

<footer class="flex h-11 shrink-0 items-center gap-3 border-t border-line bg-white px-4 text-sm">
	<span class="text-muted">
		Page {editor.activePageIndex + 1} / {editor.data.pages.length}
	</span>
	<span class="text-xs text-muted">{editor.data.width} × {editor.data.height} px</span>
	<div class="ml-auto flex items-center gap-2">
		<input
			type="range"
			class="w-36 accent-brand"
			min={toSlider(0.1)}
			max={toSlider(4)}
			step="0.01"
			value={toSlider(editor.zoom)}
			oninput={(e) => onzoom(fromSlider(Number(e.currentTarget.value)))}
			aria-label="Zoom"
		/>
		<button
			class="w-14 rounded-md px-1 py-0.5 text-center tabular-nums hover:bg-gray-100"
			title="Zoom to fit (Ctrl+0)"
			onclick={onfit}
		>
			{Math.round(editor.zoom * 100)}%
		</button>
		<button class="icon-btn size-8" title="Fit to screen" onclick={onfit}
			><Maximize class="size-4" /></button
		>
		<button class="icon-btn size-8" title="Grid view" onclick={ongrid}
			><LayoutGrid class="size-4" /></button
		>
	</div>
</footer>
