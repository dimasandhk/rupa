<script lang="ts">
	import { Crop, FlipHorizontal2, FlipVertical2, ImageOff } from '#lib/icons.ts';
	import { getEditor } from '../../context';
	import { FRAMES } from '../../model/frames';
	import type { FrameElement } from '../../model/types';

	let { el }: { el: FrameElement } = $props();
	const editor = getEditor();
	const label = $derived(
		el.frame === 'letter' ? `Letter ${el.char ?? ''} frame` : `${FRAMES[el.frame].label} frame`
	);
</script>

<span class="px-2 text-sm font-medium">{label}</span>
{#if el.image}
	<button
		class="btn-ghost"
		title="Reposition or zoom the photo (double-click the frame)"
		onclick={() => editor.startCrop(el.id)}
	>
		<Crop class="size-4" /> Adjust photo
	</button>
	<button
		class="btn-ghost"
		title="Take the photo out of the frame"
		onclick={() => editor.detachFrameImage(el.id)}
	>
		<ImageOff class="size-4" /> Detach
	</button>
	<button class="icon-btn" title="Flip horizontal" onclick={() => editor.flip('x')}
		><FlipHorizontal2 class="size-4" /></button
	>
	<button class="icon-btn" title="Flip vertical" onclick={() => editor.flip('y')}
		><FlipVertical2 class="size-4" /></button
	>
{:else}
	<span class="px-1 text-sm text-muted"
		>Drop a photo on it, or pick one from Uploads or Photos.</span
	>
{/if}
