<script lang="ts">
	import { ImageOff } from '#lib/icons.ts';
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
	const hasTypeTools = $derived(texts.length > 0 || (!!single && single.type !== 'group'));
</script>

<!-- Floats over the canvas; only the pill itself catches pointer events. -->
<div class="pointer-events-none absolute inset-x-3 top-3 z-20 flex justify-center">
	<div
		class="pointer-events-auto flex h-12 max-w-full items-center gap-0.5 overflow-x-auto rounded-2xl bg-white/95 px-1.5 shadow-float ring-1 ring-line backdrop-blur"
		role="toolbar"
		aria-label="Element tools"
	>
		{#if editor.cropId}
			<span class="pl-2 text-sm font-medium">Cropping</span>
			<span class="hidden px-2 text-sm text-muted md:inline"
				>Drag the photo to reposition it, or pull the handles to crop.</span
			>
			<button class="btn-ghost" onclick={() => editor.endCrop(false)}>Cancel</button>
			<button class="btn-primary" onclick={() => editor.endCrop(true)}>Done</button>
		{:else if !els.length}
			<ColorPicker
				title="Background color"
				value={page.background.color}
				onchange={(c) => setBackgroundColor(editor, c)}
			/>
			<span class="pr-2 text-sm text-muted">Page background</span>
			{#if page.background.image}
				<button
					class="btn-ghost"
					onclick={() =>
						editor.updatePage((p) => {
							delete p.background.image;
						})}><ImageOff class="size-4" /> Remove image</button
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
			{#if hasTypeTools}<div class="mx-1 h-6 w-px shrink-0 bg-line" aria-hidden="true"></div>{/if}
			<ArrangeTools />
		{/if}
	</div>
</div>
