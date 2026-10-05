<script lang="ts">
	import { LoaderCircle, Search } from '#lib/icons.ts';
	import { getEditor } from '../../context';
	import type { DesignData } from '../../model/types';
	import DesignThumb from '../widgets/DesignThumb.svelte';

	let { onerror }: { onerror: (m: string) => void } = $props();
	const editor = getEditor();

	interface TemplateSummary {
		id: string;
		title: string;
		width: number;
		height: number;
		thumbnail: string | null;
		templateCategory: string | null;
	}

	let templates = $state<TemplateSummary[]>([]);
	let loading = $state(true);
	let applying = $state<string | null>(null);
	let query = $state('');

	$effect(() => {
		fetch('/api/templates')
			.then((r) => r.json())
			.then((t) => (templates = t))
			.catch(() => onerror('Could not load templates'))
			.finally(() => (loading = false));
	});

	const shown = $derived.by(() => {
		const q = query.trim().toLowerCase();
		const list = q
			? templates.filter((t) => `${t.title} ${t.templateCategory}`.toLowerCase().includes(q))
			: templates;
		// Templates matching the design's aspect ratio first.
		const ratio = editor.data.width / editor.data.height;
		return [...list].sort(
			(a, b) =>
				Math.abs(Math.log(a.width / a.height / ratio)) -
				Math.abs(Math.log(b.width / b.height / ratio))
		);
	});

	async function apply(t: TemplateSummary) {
		applying = t.id;
		try {
			const res = await fetch(`/api/designs/${t.id}`);
			if (!res.ok) throw new Error('Template not found');
			const { data } = (await res.json()) as { data: DesignData };
			editor.insertPages(data);
		} catch (e) {
			onerror((e as Error).message);
		} finally {
			applying = null;
		}
	}
</script>

<label class="relative mb-3 block">
	<Search class="pointer-events-none absolute top-2.5 left-3 size-4 text-muted" />
	<input bind:value={query} placeholder="Search templates" class="input pl-9" />
</label>

{#if loading}
	<div class="grid place-items-center py-6">
		<LoaderCircle class="size-5 animate-spin text-muted" />
	</div>
{:else if !shown.length}
	<p class="py-6 text-center text-sm text-muted">
		{templates.length
			? 'No templates match.'
			: 'No templates yet. Run `pnpm db:seed` to add the starter set.'}
	</p>
{:else}
	<p class="mb-2 text-xs text-muted">Templates are resized to fit this design.</p>
	<div class="columns-2 gap-2">
		{#each shown as t (t.id)}
			<button
				class="relative mb-2 block w-full overflow-hidden rounded-lg bg-canvas text-left hover:ring-2 hover:ring-brand disabled:opacity-60"
				disabled={!!applying}
				title={t.title}
				onclick={() => apply(t)}
			>
				<DesignThumb
					id={t.id}
					src={t.thumbnail}
					width={t.width}
					height={t.height}
					alt={t.title}
					class="w-full"
				/>
				{#if applying === t.id}
					<div class="absolute inset-0 grid place-items-center bg-white/60">
						<LoaderCircle class="size-5 animate-spin" />
					</div>
				{/if}
			</button>
		{/each}
	</div>
{/if}
