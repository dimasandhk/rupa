<script lang="ts">
	import { goto } from '$app/navigation';
	import { Scaling } from '#lib/icons.ts';
	import { createDesign } from '#lib/api.ts';
	import { PRESETS } from '#lib/presets.ts';
	import { create } from 'mutative';
	import { resizeDesign } from '../../commands/scale';
	import { getEditor } from '../../context';
	import Pop from '../widgets/Pop.svelte';

	let { onerror, beforecopy }: { onerror: (m: string) => void; beforecopy: () => Promise<void> } =
		$props();
	const editor = getEditor();

	let open = $state(false);
	let width = $state(editor.data.width);
	let height = $state(editor.data.height);
	let busy = $state(false);

	$effect(() => {
		if (open) {
			width = editor.data.width;
			height = editor.data.height;
		}
	});

	const valid = $derived(width >= 16 && height >= 16 && width <= 8000 && height <= 8000);

	function resizeHere() {
		editor.resize(Math.round(width), Math.round(height));
		open = false;
	}

	async function copyAndResize() {
		busy = true;
		try {
			await beforecopy();
			const data = create(editor.data, (d) =>
				resizeDesign(d, Math.round(width), Math.round(height))
			);
			const { id } = await createDesign({
				title: `${editor.title} (${Math.round(width)}×${Math.round(height)})`,
				data
			});
			open = false;
			await goto(`/design/${id}`);
		} catch (err) {
			onerror((err as Error).message);
		} finally {
			busy = false;
		}
	}
</script>

<Pop title="Resize" bind:open triggerClass="btn-ghost" width={340} align="end">
	{#snippet trigger()}<Scaling class="size-4" /> Resize{/snippet}
	<div class="panel-title">Resize design</div>
	<div class="max-h-56 space-y-0.5 overflow-y-auto">
		{#each PRESETS as p (p.name)}
			<button
				class="flex w-full items-center rounded-lg px-2 py-1.5 text-left text-sm hover:bg-gray-100"
				class:bg-brand-50={p.width === width && p.height === height}
				onclick={() => {
					width = p.width;
					height = p.height;
				}}
			>
				{p.name}<span class="ml-auto text-xs text-muted">{p.width} × {p.height}</span>
			</button>
		{/each}
	</div>
	<div class="mt-3 flex items-end gap-2">
		<label class="flex-1 text-xs font-medium text-muted"
			>Width <input type="number" bind:value={width} class="mt-1 input" /></label
		>
		<label class="flex-1 text-xs font-medium text-muted"
			>Height <input type="number" bind:value={height} class="mt-1 input" /></label
		>
	</div>
	<div class="mt-3 grid grid-cols-2 gap-2">
		<button class="btn-outline" disabled={!valid || busy} onclick={copyAndResize}
			>Copy & resize</button
		>
		<button class="btn-primary" disabled={!valid || busy} onclick={resizeHere}>Resize</button>
	</div>
</Pop>
