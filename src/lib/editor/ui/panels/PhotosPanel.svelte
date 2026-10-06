<script lang="ts">
	import { LoaderCircle, Search } from '#lib/icons.ts';
	import { loadImage } from '../../canvas/images';
	import { getEditor } from '../../context';
	import { addImage, startImageDrag } from '../../insert';
	import type { FramePhoto } from '../../state/editor.svelte';

	let { onerror }: { onerror: (m: string) => void } = $props();
	const editor = getEditor();

	interface Photo {
		id: string;
		provider: 'unsplash' | 'pexels' | 'wikimedia';
		thumb: string;
		url?: string;
		width: number;
		height: number;
		author: string;
		authorUrl: string;
	}

	const CREDIT = {
		unsplash: 'Unsplash',
		pexels: 'Pexels',
		wikimedia: 'Wikimedia Commons (check each license)'
	};

	let query = $state('nature');
	let photos = $state<Photo[]>([]);
	let provider = $state<Photo['provider'] | null>(null);
	let page = $state(1);
	let loading = $state(false);
	let adding = $state<string | null>(null);
	let done = $state(false);

	async function load(reset: boolean) {
		if (loading || !query.trim()) return;
		loading = true;
		try {
			const next = reset ? 1 : page + 1;
			const res = await fetch(`/api/stock/search?q=${encodeURIComponent(query)}&page=${next}`);
			if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? 'Search failed');
			const body = await res.json();
			provider = body.provider;
			photos = reset ? body.photos : [...photos, ...body.photos];
			done = body.photos.length === 0;
			page = next;
		} catch (e) {
			onerror((e as Error).message);
		} finally {
			loading = false;
		}
	}

	/** Import a stock photo into storage (Unsplash is hotlinked) and measure it. */
	async function resolve(p: Photo): Promise<FramePhoto> {
		const res = await fetch('/api/stock/use', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ provider: p.provider, id: p.id })
		});
		if (!res.ok)
			throw new Error((await res.json().catch(() => ({}))).message ?? 'Could not add photo');
		const { url } = await res.json();
		const src = url ?? p.url!;
		const img = await loadImage(src);
		return { src, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight };
	}

	async function add(p: Photo) {
		adding = p.id;
		try {
			const photo = await resolve(p);
			addImage(editor, photo.src, photo.naturalWidth, photo.naturalHeight);
		} catch (e) {
			onerror((e as Error).message);
		} finally {
			adding = null;
		}
	}

	$effect(() => {
		load(true);
	});
</script>

<form
	class="relative mb-3"
	onsubmit={(e) => {
		e.preventDefault();
		load(true);
	}}
>
	<Search class="pointer-events-none absolute top-2.5 left-3 size-4 text-muted" />
	<input bind:value={query} placeholder="Search photos" class="input pl-9" />
</form>

<div class="columns-2 gap-2">
	{#each photos as p (p.provider + p.id)}
		<div class="group relative mb-2">
			<button
				class="block w-full overflow-hidden rounded-lg bg-canvas hover:ring-2 hover:ring-brand"
				style:aspect-ratio="{p.width}/{p.height}"
				disabled={!!adding}
				onclick={() => add(p)}
				draggable="true"
				ondragstart={(e) => startImageDrag(e, () => resolve(p))}
			>
				<img src={p.thumb} alt="" class="size-full object-cover" loading="lazy" />
				{#if adding === p.id}
					<div class="absolute inset-0 grid place-items-center bg-white/60">
						<LoaderCircle class="size-5 animate-spin" />
					</div>
				{/if}
			</button>
			<a
				href={p.authorUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="absolute right-1 bottom-1 left-1 truncate rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white opacity-0 group-hover:opacity-100"
			>
				{p.author}
			</a>
		</div>
	{/each}
</div>

{#if loading}
	<div class="grid place-items-center py-4">
		<LoaderCircle class="size-5 animate-spin text-muted" />
	</div>
{:else if photos.length && !done}
	<button class="mt-1 btn-outline w-full" onclick={() => load(false)}>Load more</button>
{:else if !photos.length}
	<p class="py-6 text-center text-sm text-muted">No photos found.</p>
{/if}
{#if provider}
	<p class="mt-3 text-[11px] text-muted">
		Photos from {CREDIT[provider]}.{#if provider === 'wikimedia'}
			Add an Unsplash or Pexels key in .env for more results.{/if}
	</p>
{/if}
