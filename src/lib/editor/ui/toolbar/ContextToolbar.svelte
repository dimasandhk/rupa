<script lang="ts">
	import { ImageOff } from '@lucide/svelte';
	import { getEditor } from '../../context';
	import { setBackgroundColor } from '../../insert';
	import type { ImageElement, TextElement } from '../../model/types';
	import ColorPicker from '../widgets/ColorPicker.svelte';
	import ArrangeTools from './ArrangeTools.svelte';
	import ImageTools from './ImageTools.svelte';
	import ShapeTools from './ShapeTools.svelte';
	import TextTools from './TextTools.svelte';

	let {
		onremovebg,
		removingId
	}: { onremovebg: (el: ImageElement) => void; removingId: string | null } = $props();

	const editor = getEditor();
	const els = $derived(editor.selectedElements);
	const types = $derived(new Set(els.map((e) => e.type)));
	const single = $derived(els.length === 1 ? els[0] : undefined);
	const texts = $derived(types.size === 1 && types.has('text') ? (els as TextElement[]) : []);
	const page = $derived(editor.activePage);
</script>

<div
	class="flex h-14 shrink-0 items-center gap-1 overflow-x-auto border-b border-line bg-white px-3"
	role="toolbar"
	aria-label="Element tools"
>
	{#if editor.cropId}
		<span class="text-sm font-medium">Crop</span>
		<span class="text-sm text-muted"
			>Drag the photo to reposition it, or drag the handles to crop.</span
		>
		<div class="ml-auto flex gap-2">
			<button class="btn-ghost" onclick={() => editor.endCrop(false)}>Cancel</button>
			<button class="btn-primary" onclick={() => editor.endCrop(true)}>Done</button>
		</div>
	{:else if !els.length}
		<ColorPicker
			title="Background color"
			value={page.background.color}
			onchange={(c) => setBackgroundColor(editor, c)}
		/>
		<span class="text-sm text-muted">Background</span>
		{#if page.background.image}
			<button
				class="btn-ghost"
				onclick={() =>
					editor.updatePage((p) => {
						delete p.background.image;
					})}><ImageOff class="size-4" /> Remove background image</button
			>
		{/if}
	{:else}
		{#if texts.length}
			<TextTools els={texts} />
		{:else if single?.type === 'image'}
			<ImageTools el={single} {onremovebg} removing={removingId === single.id} />
		{:else if single && (single.type === 'shape' || single.type === 'line' || single.type === 'icon')}
			<ShapeTools el={single} />
		{/if}
		<div class="ml-auto flex items-center gap-1 pl-2">
			<ArrangeTools />
		</div>
	{/if}
</div>
