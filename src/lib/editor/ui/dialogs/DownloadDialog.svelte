<script lang="ts">
	import { Download, LoaderCircle } from '#lib/icons.ts';
	import { exportDesign, type ExportFormat } from '../../canvas/download';
	import { getEditor } from '../../context';
	import Pop from '../widgets/Pop.svelte';

	let { onerror }: { onerror: (message: string) => void } = $props();
	const editor = getEditor();

	let open = $state(false);
	let format = $state<ExportFormat>('png');
	let scale = $state(1);
	let transparent = $state(false);
	let which = $state<'all' | 'current'>('all');
	let busy = $state(false);

	const pageCount = $derived(editor.data.pages.length);
	const outW = $derived(Math.round(editor.data.width * scale));
	const outH = $derived(Math.round(editor.data.height * scale));

	async function run() {
		busy = true;
		try {
			const pages = which === 'all' ? editor.data.pages.map((_, i) => i) : [editor.activePageIndex];
			await exportDesign(editor.data, editor.title, { format, scale, transparent, pages });
			open = false;
		} catch (err) {
			onerror(`Download failed: ${(err as Error).message}`);
		} finally {
			busy = false;
		}
	}

	const FORMATS: { id: ExportFormat; label: string; hint: string }[] = [
		{ id: 'png', label: 'PNG', hint: 'High quality image' },
		{ id: 'jpg', label: 'JPG', hint: 'Small file size image' },
		{ id: 'pdf', label: 'PDF', hint: 'Best for documents & printing' }
	];
</script>

<Pop title="Export" bind:open triggerClass="btn-primary" width={320} align="end">
	{#snippet trigger()}<Download class="size-4" /> Export{/snippet}
	<div class="space-y-4">
		<div>
			<div class="panel-title">File type</div>
			<div class="grid gap-1">
				{#each FORMATS as f (f.id)}
					<label
						class="flex cursor-pointer items-center gap-3 rounded-lg border border-line px-3 py-2 text-sm has-checked:border-brand has-checked:bg-brand-50"
					>
						<input
							type="radio"
							name="format"
							value={f.id}
							bind:group={format}
							class="accent-brand"
						/>
						<span class="font-medium">{f.label}</span>
						<span class="ml-auto text-xs text-muted">{f.hint}</span>
					</label>
				{/each}
			</div>
		</div>

		{#if format !== 'pdf'}
			<div>
				<div class="mb-1 flex justify-between text-sm">
					<span class="font-semibold">Size ×{scale}</span>
					<span class="text-muted">{outW} × {outH} px</span>
				</div>
				<input
					type="range"
					min="0.5"
					max="3"
					step="0.25"
					bind:value={scale}
					class="w-full accent-brand"
				/>
			</div>
		{/if}

		{#if format === 'png'}
			<label class="flex items-center gap-2 text-sm">
				<input type="checkbox" bind:checked={transparent} class="accent-brand" /> Transparent background
			</label>
		{/if}

		{#if pageCount > 1}
			<div>
				<div class="panel-title">Pages</div>
				<select bind:value={which} class="input">
					<option value="all">All pages ({pageCount}){format === 'pdf' ? '' : ' — as .zip'}</option>
					<option value="current">Current page ({editor.activePageIndex + 1})</option>
				</select>
			</div>
		{/if}

		<button class="btn-primary w-full" onclick={run} disabled={busy}>
			{#if busy}<LoaderCircle class="size-4 animate-spin" /> Preparing…{:else}Download{/if}
		</button>
	</div>
</Pop>
