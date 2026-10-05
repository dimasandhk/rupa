<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { createDesign, deleteDesign } from '#lib/api.ts';
	import { PRESETS } from '#lib/presets.ts';
	import DesignThumb from '#lib/editor/ui/widgets/DesignThumb.svelte';
	import { page } from '$app/state';
	import { Copy, LogOut, MoreHorizontal, Plus, Search, Trash2 } from '@lucide/svelte';
	import { DropdownMenu } from 'bits-ui';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let query = $state('');
	let customOpen = $state(false);
	let customW = $state(1080);
	let customH = $state(1080);
	let busy = $state(false);

	const filtered = $derived(
		data.designs.filter((d) => d.title.toLowerCase().includes(query.trim().toLowerCase()))
	);

	async function create(body: Parameters<typeof createDesign>[0]) {
		if (busy) return;
		busy = true;
		try {
			const { id } = await createDesign(body);
			await goto(`/design/${id}`);
		} finally {
			busy = false;
		}
	}

	// Opening someone else's template URL lands here: make a copy and open it.
	$effect(() => {
		const tpl = page.url.searchParams.get('template');
		if (tpl) create({ sourceId: tpl });
	});

	async function remove(id: string) {
		await deleteDesign(id);
		await invalidateAll();
	}

	/** Aspect-correct preview box for a preset tile. */
	function tileBox(w: number, h: number, max = 56) {
		const s = max / Math.max(w, h);
		return `width:${Math.round(w * s)}px;height:${Math.round(h * s)}px`;
	}

	const ago = (d: Date | string) => {
		const s = (Date.now() - new Date(d).getTime()) / 1000;
		if (s < 60) return 'just now';
		if (s < 3600) return `${Math.floor(s / 60)} min ago`;
		if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
		return new Date(d).toLocaleDateString();
	};
</script>

<svelte:head><title>Home · Rupa</title></svelte:head>

<header
	class="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-line bg-white/90 px-6 backdrop-blur"
>
	<a href="/" class="text-2xl font-extrabold tracking-tight text-brand">Rupa</a>
	<label class="relative ml-6 hidden max-w-md flex-1 md:block">
		<Search class="pointer-events-none absolute top-2.5 left-3 size-4 text-muted" />
		<input bind:value={query} placeholder="Search your designs" class="input pl-9" />
	</label>
	<div class="ml-auto flex items-center gap-3">
		<button class="btn-primary" onclick={() => (customOpen = !customOpen)}>
			<Plus class="size-4" /> Create a design
		</button>
		<form method="post" action="/login?/signOut">
			<button class="icon-btn" title="Sign out ({data.user.email})"
				><LogOut class="size-4" /></button
			>
		</form>
		<div
			class="grid size-9 place-items-center rounded-full bg-brand text-sm font-semibold text-white uppercase"
			title={data.user.email}
		>
			{data.user.name.slice(0, 1)}
		</div>
	</div>
</header>

<main class="mx-auto max-w-7xl px-6 pb-16">
	<section
		class="mt-6 rounded-2xl bg-gradient-to-r from-[#00c4cc] via-[#6a5cff] to-[#8b3dff] px-8 py-10 text-center text-white"
	>
		<h1 class="text-3xl font-bold md:text-4xl">What will you design today?</h1>
		{#if customOpen}
			<form
				class="mx-auto mt-6 flex max-w-md items-end gap-2 rounded-xl bg-white p-3 text-left text-ink"
				onsubmit={(e) => {
					e.preventDefault();
					create({ width: customW, height: customH });
				}}
			>
				<label class="flex-1 text-xs font-medium text-muted">
					Width (px)
					<input type="number" min="16" max="8000" bind:value={customW} class="mt-1 input" />
				</label>
				<label class="flex-1 text-xs font-medium text-muted">
					Height (px)
					<input type="number" min="16" max="8000" bind:value={customH} class="mt-1 input" />
				</label>
				<button class="btn-primary" disabled={busy}>Create new design</button>
			</form>
		{/if}
	</section>

	<section class="mt-8">
		<h2 class="mb-3 text-lg font-semibold">Start with a size</h2>
		<div class="flex gap-3 overflow-x-auto pb-2">
			{#each PRESETS as p (p.name)}
				<button
					class="group flex w-32 shrink-0 flex-col items-center gap-2 rounded-xl p-2 text-center hover:bg-gray-50"
					disabled={busy}
					onclick={() => create({ title: p.name, width: p.width, height: p.height })}
				>
					<div
						class="grid size-24 place-items-center rounded-xl bg-canvas transition group-hover:bg-brand-50"
					>
						<div
							class="rounded-sm border border-line bg-white shadow-sm"
							style={tileBox(p.width, p.height)}
						></div>
					</div>
					<span class="text-xs font-medium">{p.name}</span>
					<span class="-mt-2 text-[11px] text-muted">{p.width} × {p.height}</span>
				</button>
			{/each}
		</div>
	</section>

	{#if data.templates.length}
		<section class="mt-8">
			<h2 class="mb-3 text-lg font-semibold">Templates</h2>
			<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
				{#each data.templates as t (t.id)}
					<button
						class="group text-left"
						disabled={busy}
						onclick={() => create({ sourceId: t.id })}
					>
						<div
							class="grid aspect-square place-items-center overflow-hidden rounded-xl bg-canvas p-3 transition group-hover:ring-2 group-hover:ring-brand"
						>
							<DesignThumb
								id={t.id}
								src={t.thumbnail}
								width={t.width}
								height={t.height}
								class="max-h-full max-w-full rounded shadow"
							/>
						</div>
						<div class="mt-1.5 truncate text-sm font-medium">{t.title}</div>
						<div class="text-xs text-muted">{t.templateCategory ?? 'Template'}</div>
					</button>
				{/each}
			</div>
		</section>
	{/if}

	<section class="mt-8">
		<h2 class="mb-3 text-lg font-semibold">Recent designs</h2>
		{#if !filtered.length}
			<p class="rounded-xl border border-dashed border-line p-10 text-center text-sm text-muted">
				{data.designs.length
					? 'No designs match your search.'
					: 'Designs you create will show up here.'}
			</p>
		{:else}
			<div class="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
				{#each filtered as d (d.id)}
					<div class="group relative">
						<a href="/design/{d.id}" class="block">
							<div
								class="grid aspect-[4/3] place-items-center overflow-hidden rounded-xl bg-canvas p-3 transition group-hover:ring-2 group-hover:ring-brand"
							>
								{#if d.thumbnail}
									<img
										src={d.thumbnail}
										alt=""
										class="max-h-full max-w-full rounded shadow"
										loading="lazy"
									/>
								{:else}
									<div
										class="rounded-sm bg-white shadow"
										style={tileBox(d.width, d.height, 120)}
									></div>
								{/if}
							</div>
							<div class="mt-1.5 truncate text-sm font-medium">{d.title}</div>
							<div class="text-xs text-muted">{d.width} × {d.height} px · {ago(d.updatedAt)}</div>
						</a>
						<DropdownMenu.Root>
							<DropdownMenu.Trigger
								class="absolute top-2 right-2 grid size-8 place-items-center rounded-lg bg-white/90 opacity-0 shadow group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100"
								aria-label="Design options"
							>
								<MoreHorizontal class="size-4" />
							</DropdownMenu.Trigger>
							<DropdownMenu.Portal>
								<DropdownMenu.Content class="popover w-44 p-1" align="end" sideOffset={4}>
									<DropdownMenu.Item
										class="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm data-highlighted:bg-gray-100"
										onSelect={() => create({ sourceId: d.id, title: `${d.title} (copy)` })}
									>
										<Copy class="size-4" /> Make a copy
									</DropdownMenu.Item>
									<DropdownMenu.Item
										class="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-red-600 data-highlighted:bg-red-50"
										onSelect={() => remove(d.id)}
									>
										<Trash2 class="size-4" /> Delete
									</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Portal>
						</DropdownMenu.Root>
					</div>
				{/each}
			</div>
		{/if}
	</section>
</main>
