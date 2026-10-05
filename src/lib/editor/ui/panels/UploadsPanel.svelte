<script lang="ts">
	import { CloudUpload, LoaderCircle } from '#lib/icons.ts';
	import { listUploads, type UploadedImage } from '#lib/api.ts';
	import { getEditor } from '../../context';
	import { addImage, addImageFile } from '../../insert';

	let { onerror }: { onerror: (m: string) => void } = $props();
	const editor = getEditor();

	let uploads = $state<UploadedImage[]>([]);
	let loading = $state(true);
	let pending = $state(0);
	let input: HTMLInputElement;

	$effect(() => {
		listUploads()
			.then((u) => (uploads = u))
			.catch((e) => onerror(e.message))
			.finally(() => (loading = false));
	});

	async function upload(files: FileList | File[]) {
		for (const file of files) {
			if (!file.type.startsWith('image/')) continue;
			pending++;
			try {
				const up = await addImageFile(editor, file);
				uploads = [up, ...uploads];
			} catch (e) {
				onerror((e as Error).message);
			} finally {
				pending--;
			}
		}
	}
</script>

<div class="space-y-4">
	<input
		bind:this={input}
		type="file"
		accept="image/png,image/jpeg,image/webp,image/gif"
		multiple
		hidden
		onchange={(e) => e.currentTarget.files && upload(e.currentTarget.files)}
	/>
	<button class="btn-primary w-full" onclick={() => input.click()} disabled={pending > 0}>
		{#if pending}<LoaderCircle class="size-4 animate-spin" /> Uploading…{:else}<CloudUpload
				class="size-4"
			/> Upload files{/if}
	</button>
	<p class="text-center text-xs text-muted">or drop images anywhere on the canvas</p>

	{#if loading}
		<div class="grid place-items-center py-6">
			<LoaderCircle class="size-5 animate-spin text-muted" />
		</div>
	{:else if !uploads.length}
		<p class="py-6 text-center text-sm text-muted">Images you upload will appear here.</p>
	{:else}
		<div class="columns-2 gap-2">
			{#each uploads as u (u.id)}
				<button
					class="mb-2 block w-full overflow-hidden rounded-lg bg-canvas hover:ring-2 hover:ring-brand"
					onclick={() => addImage(editor, u.url, u.width ?? 800, u.height ?? 800, u.id)}
				>
					<img src={u.url} alt="" class="w-full" loading="lazy" />
				</button>
			{/each}
		</div>
	{/if}
</div>
