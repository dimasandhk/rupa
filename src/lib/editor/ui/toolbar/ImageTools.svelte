<script lang="ts">
	import {
		Crop,
		FlipHorizontal2,
		FlipVertical2,
		Frame,
		SlidersHorizontal,
		Wand2,
		Undo2,
		LoaderCircle
	} from '#lib/icons.ts';
	import { getEditor } from '../../context';
	import type { ImageElement, ImageFilters } from '../../model/types';
	import ColorPicker from '../widgets/ColorPicker.svelte';
	import Pop from '../widgets/Pop.svelte';
	import RangeField from '../widgets/RangeField.svelte';

	let {
		el,
		onremovebg,
		removing = false
	}: { el: ImageElement; onremovebg: (el: ImageElement) => void; removing?: boolean } = $props();
	const editor = getEditor();

	function set(recipe: (i: ImageElement) => void, key?: string) {
		editor.updateSelected(
			(e) => e.type === 'image' && recipe(e),
			key ? { key: `${key}:${el.id}` } : undefined
		);
	}
	const seal = () => editor.sealHistory();

	const NONE: ImageFilters = {
		brightness: 0,
		contrast: 0,
		saturation: 0,
		blur: 0,
		grayscale: false,
		sepia: false
	};
	const FILTERS: { name: string; f: ImageFilters }[] = [
		{ name: 'Original', f: NONE },
		{ name: 'B&W', f: { ...NONE, grayscale: true, contrast: 10 } },
		{ name: 'Sepia', f: { ...NONE, sepia: true } },
		{ name: 'Vivid', f: { ...NONE, saturation: 0.6, contrast: 15 } },
		{ name: 'Fade', f: { ...NONE, brightness: 0.1, contrast: -25, saturation: -0.3 } },
		{ name: 'Noir', f: { ...NONE, grayscale: true, contrast: 45, brightness: -0.05 } },
		{ name: 'Warm', f: { ...NONE, saturation: 0.25, brightness: 0.05 } },
		{ name: 'Soft', f: { ...NONE, blur: 2, brightness: 0.05 } }
	];
	const same = (a: ImageFilters, b: ImageFilters) =>
		(Object.keys(a) as (keyof ImageFilters)[]).every((k) => a[k] === b[k]);

	/** CSS approximation of a filter set for the preset thumbnails. */
	function css(f: ImageFilters) {
		return [
			`brightness(${1 + f.brightness})`,
			`contrast(${1 + f.contrast / 100})`,
			`saturate(${1 + f.saturation})`,
			f.blur ? `blur(${f.blur / 4}px)` : '',
			f.grayscale ? 'grayscale(1)' : '',
			f.sepia ? 'sepia(1)' : ''
		].join(' ');
	}
</script>

<Pop title="Edit photo" triggerClass="btn-ghost" width={320}>
	{#snippet trigger()}<SlidersHorizontal class="size-4" /> Edit{/snippet}
	<div class="panel-title">Filters</div>
	<div class="grid grid-cols-4 gap-2">
		{#each FILTERS as p (p.name)}
			<button class="text-center text-[11px]" onclick={() => set((i) => (i.filters = { ...p.f }))}>
				<img
					src={el.src}
					alt=""
					crossorigin="anonymous"
					class="aspect-square w-full rounded-lg object-cover ring-offset-1"
					class:ring-2={same(el.filters, p.f)}
					class:ring-brand={same(el.filters, p.f)}
					style:filter={css(p.f)}
				/>
				{p.name}
			</button>
		{/each}
	</div>
	<div class="mt-4 panel-title">Adjust</div>
	<RangeField
		label="Brightness"
		value={Math.round(el.filters.brightness * 100)}
		min={-100}
		max={100}
		oninput={(v) => set((i) => (i.filters.brightness = v / 100), 'bright')}
		onchange={seal}
	/>
	<RangeField
		label="Contrast"
		value={el.filters.contrast}
		min={-100}
		max={100}
		oninput={(v) => set((i) => (i.filters.contrast = v), 'contrast')}
		onchange={seal}
	/>
	<RangeField
		label="Saturation"
		value={Math.round(el.filters.saturation * 100)}
		min={-100}
		max={200}
		oninput={(v) => set((i) => (i.filters.saturation = v / 100), 'sat')}
		onchange={seal}
	/>
	<RangeField
		label="Blur"
		value={el.filters.blur}
		min={0}
		max={40}
		oninput={(v) => set((i) => (i.filters.blur = v), 'blur')}
		onchange={seal}
	/>
</Pop>

<button
	class="btn-ghost"
	disabled={removing}
	onclick={() => onremovebg(el)}
	title={el.originalSrc ? 'Restore the original background' : 'Remove the background'}
>
	{#if removing}
		<LoaderCircle class="size-4 animate-spin" /> Removing…
	{:else if el.originalSrc}
		<Undo2 class="size-4" /> Restore background
	{:else}
		<Wand2 class="size-4" /> BG Remover
	{/if}
</button>

<button
	class="btn-ghost"
	title="Crop (double-click the image)"
	onclick={() => editor.startCrop(el.id)}><Crop class="size-4" /> Crop</button
>

<button class="icon-btn" title="Flip horizontal" onclick={() => editor.flip('x')}
	><FlipHorizontal2 class="size-4" /></button
>
<button class="icon-btn" title="Flip vertical" onclick={() => editor.flip('y')}
	><FlipVertical2 class="size-4" /></button
>

<Pop title="Corners & border" triggerClass="icon-btn" width={300}>
	{#snippet trigger()}<Frame class="size-4" />{/snippet}
	<RangeField
		label="Corner rounding"
		value={el.cornerRadius}
		min={0}
		max={Math.round(Math.min(el.width, el.height) / 2)}
		oninput={(v) => set((i) => (i.cornerRadius = v), 'radius')}
		onchange={seal}
	/>
	<RangeField
		label="Border weight"
		value={el.border?.width ?? 0}
		min={0}
		max={60}
		oninput={(v) =>
			set((i) => (i.border = { color: i.border?.color ?? '#000000', width: v }), 'border')}
		onchange={seal}
	/>
	{#if el.border?.width}
		<div class="flex items-center gap-3 py-1">
			<span class="w-24 text-xs font-medium text-muted">Border color</span>
			<ColorPicker
				title="Border color"
				value={el.border.color}
				onchange={(c) => set((i) => i.border && (i.border.color = c), 'bcolor')}
			/>
		</div>
	{/if}
</Pop>
