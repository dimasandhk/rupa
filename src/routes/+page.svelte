<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { createDesign, deleteDesign } from '#lib/api.ts';
	import DesignThumb from '#lib/editor/ui/widgets/DesignThumb.svelte';
	import { Copy, LogOut, MoreHorizontal, Plus, Search, Trash2 } from '#lib/icons.ts';
	import { PRESETS } from '#lib/presets.ts';
	import Wordmark from '#lib/ui/Wordmark.svelte';
	import { DropdownMenu } from 'bits-ui';
	import { slide } from 'svelte/transition';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let query = $state('');
	let customOpen = $state(false);
	let customW = $state(1080);
	let customH = $state(1350);
	let busy = $state(false);
	let startSection: HTMLElement;

	const firstName = $derived(data.user.name.split(' ')[0]);
	const q = $derived(query.trim().toLowerCase());
	const designs = $derived(data.designs.filter((d) => d.title.toLowerCase().includes(q)));
	const templates = $derived(
		data.templates.filter((t) => `${t.title} ${t.templateCategory}`.toLowerCase().includes(q))
	);
	// Three templates fanned out in the hero, preferring upright formats.
	const collage = $derived(
		[...data.templates].sort((a, b) => b.height / b.width - a.height / a.width).slice(0, 3)
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

	function openCustom() {
		customOpen = true;
		startSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	/** Aspect-correct preview box for a size tile. */
	function tileBox(w: number, h: number, max = 64) {
		const s = max / Math.max(w, h);
		return `width:${Math.round(w * s)}px;height:${Math.round(h * s)}px`;
	}

	const ago = (d: Date | string) => {
		const s = (Date.now() - new Date(d).getTime()) / 1000;
		if (s < 60) return 'just now';
		if (s < 3600) return `${Math.floor(s / 60)} min ago`;
		if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
		return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	};

	const FAN = [
		'left-[6%] top-8 w-[34%] -rotate-[7deg]',
		'left-[32%] top-0 z-10 w-[36%] rotate-[2deg]',
		'right-[4%] top-12 w-[32%] rotate-[9deg]'
	];
</script>

<svelte:head><title>Home · Rupa</title></svelte:head>

<header class="mx-auto flex max-w-[1360px] items-center gap-4 px-6 pt-5">
	<Wordmark />
	<label class="relative ml-4 hidden max-w-sm flex-1 md:block">
		<span class="sr-only">Search designs and templates</span>
		<Search class="pointer-events-none absolute top-2.5 left-3.5 size-4 text-muted" />
		<input
			bind:value={query}
			placeholder="Search designs and templates"
			class="input h-10 rounded-full pl-10"
		/>
	</label>
	<div class="ml-auto flex items-center gap-2">
		<button class="btn-primary h-10 rounded-full px-4" onclick={openCustom}>
			<Plus class="size-4" weight="bold" /> New design
		</button>
		<div
			class="grid size-10 place-items-center rounded-xl bg-ink font-display text-lg text-paper italic"
			title={data.user.email}
		>
			{firstName.slice(0, 1).toUpperCase()}
		</div>
		<form method="post" action="/login?/signOut">
			<button class="icon-btn size-10" title="Sign out ({data.user.email})">
				<LogOut class="size-[18px]" />
			</button>
		</form>
	</div>
</header>

<main class="mx-auto max-w-[1360px] px-6 pb-28">
	<section class="grid items-center gap-10 pt-16 pb-14 lg:grid-cols-[1.2fr_1fr]">
		<div>
			<p class="eyebrow">Hi {firstName}</p>
			<h1 class="mt-3 font-display text-5xl leading-[0.98] font-medium md:text-7xl">
				What are we <em class="text-brand">making</em> today?
			</h1>
			<p class="mt-6 max-w-[46ch] text-lg text-muted">
				Start from a blank size, borrow a template, or pick up a design where you left it.
			</p>
			<div class="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
				<button
					class="btn-primary h-11 rounded-full px-5"
					disabled={busy}
					onclick={() => create({ title: 'Instagram Post', width: 1080, height: 1080 })}
				>
					Blank square
				</button>
				<a
					href="#templates"
					class="text-sm font-medium underline decoration-line underline-offset-4 hover:decoration-brand"
				>
					Browse {data.templates.length} templates
				</a>
			</div>
		</div>
		{#if collage.length}
			<div class="relative hidden h-80 lg:block" aria-hidden="true">
				{#each collage as t, i (t.id)}
					<div
						class="absolute rounded-xl bg-white p-1.5 shadow-page transition duration-500 ease-(--ease-spring) hover:z-20 hover:-translate-y-2 hover:rotate-0 {FAN[
							i
						]}"
					>
						<div class="aspect-[4/5] overflow-hidden rounded-lg">
							<DesignThumb
								id={t.id}
								src={t.thumbnail}
								width={t.width}
								height={t.height}
								class="size-full object-cover object-top"
							/>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<section bind:this={startSection} class="scroll-mt-6">
		<div class="mb-4 flex items-end gap-4">
			<h2 class="font-display text-3xl font-medium">Start blank</h2>
			<button
				class="mb-1 text-sm font-medium text-muted underline decoration-line underline-offset-4 hover:text-ink"
				aria-expanded={customOpen}
				onclick={() => (customOpen = !customOpen)}
			>
				{customOpen ? 'Hide custom size' : 'Custom size'}
			</button>
		</div>
		{#if customOpen}
			<form
				transition:slide={{ duration: 200 }}
				class="mb-5 flex max-w-xl flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-line"
				onsubmit={(e) => {
					e.preventDefault();
					create({ width: customW, height: customH });
				}}
			>
				<label class="w-28 text-xs font-medium text-muted">
					Width (px)
					<input
						type="number"
						min="16"
						max="8000"
						required
						bind:value={customW}
						class="mt-1 input tabular-nums"
					/>
				</label>
				<span class="pb-2 text-muted">×</span>
				<label class="w-28 text-xs font-medium text-muted">
					Height (px)
					<input
						type="number"
						min="16"
						max="8000"
						required
						bind:value={customH}
						class="mt-1 input tabular-nums"
					/>
				</label>
				<button class="ml-auto btn-primary" disabled={busy}>Create design</button>
			</form>
		{/if}
		<div class="-mx-6 flex snap-x scroll-px-6 gap-3 overflow-x-auto px-6 pb-3">
			{#each PRESETS as p (p.name)}
				<button
					class="group w-36 shrink-0 snap-start text-left"
					disabled={busy}
					onclick={() => create({ title: p.name, width: p.width, height: p.height })}
				>
					<div
						class="grid h-32 place-items-center rounded-2xl canvas-dots ring-1 ring-line transition duration-300 ease-(--ease-spring) group-hover:-translate-y-1 group-hover:shadow-soft group-hover:ring-ink/15"
					>
						<div
							class="rounded-[3px] bg-white shadow-soft transition duration-300 group-hover:scale-105"
							style={tileBox(p.width, p.height)}
						></div>
					</div>
					<div class="mt-2 text-sm font-medium">{p.name}</div>
					<div class="text-xs text-muted tabular-nums">{p.width} × {p.height}</div>
				</button>
			{/each}
		</div>
	</section>

	{#if data.templates.length}
		<section id="templates" class="mt-16 scroll-mt-6">
			<div class="mb-5 flex items-baseline gap-3">
				<h2 class="font-display text-3xl font-medium">Templates</h2>
				<span class="text-sm text-muted tabular-nums">{templates.length}</span>
			</div>
			{#if templates.length}
				<div class="columns-2 gap-5 md:columns-3 xl:columns-5">
					{#each templates as t (t.id)}
						<button
							class="group mb-6 block w-full break-inside-avoid text-left"
							disabled={busy}
							onclick={() => create({ sourceId: t.id })}
						>
							<div
								class="rounded-2xl bg-white/60 p-3 ring-1 ring-line transition duration-300 ease-(--ease-spring) group-hover:-translate-y-1 group-hover:bg-white group-hover:shadow-page"
							>
								<DesignThumb
									id={t.id}
									src={t.thumbnail}
									width={t.width}
									height={t.height}
									alt={t.title}
									class="w-full rounded-md"
								/>
							</div>
							<div class="mt-2 text-sm font-medium">{t.title}</div>
							<div class="text-xs text-muted">{t.templateCategory ?? 'Template'}</div>
						</button>
					{/each}
				</div>
			{:else}
				<p class="text-sm text-muted">No templates match “{query}”.</p>
			{/if}
		</section>
	{/if}

	<section class="mt-16">
		<div class="mb-5 flex items-baseline gap-3">
			<h2 class="font-display text-3xl font-medium">Your designs</h2>
			<span class="text-sm text-muted tabular-nums">{designs.length}</span>
		</div>
		{#if !data.designs.length}
			<div
				class="grid items-center gap-8 rounded-3xl bg-white/60 p-10 ring-1 ring-line md:grid-cols-[auto_1fr]"
			>
				<div class="relative h-28 w-36" aria-hidden="true">
					<div
						class="absolute top-2 left-2 h-24 w-20 -rotate-6 rounded-md bg-white shadow-page"
					></div>
					<div
						class="absolute top-0 left-14 h-24 w-20 rotate-3 rounded-md bg-brand-50 shadow-page ring-1 ring-brand/20"
					></div>
				</div>
				<div>
					<h3 class="font-display text-2xl font-medium">Nothing here yet</h3>
					<p class="mt-1 max-w-[52ch] text-muted">
						Designs save automatically as you work and show up here, newest first.
					</p>
					<button class="mt-4 btn-primary" onclick={openCustom}>Start your first design</button>
				</div>
			</div>
		{:else if !designs.length}
			<p class="text-sm text-muted">No designs match “{query}”.</p>
		{:else}
			<div class="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
				{#each designs as d (d.id)}
					<article class="group relative">
						<a href="/design/{d.id}" class="block rounded-2xl">
							<div
								class="grid aspect-[4/3] place-items-center overflow-hidden rounded-2xl canvas-dots p-5 ring-1 ring-line transition duration-300 ease-(--ease-spring) group-hover:-translate-y-1 group-hover:shadow-page"
							>
								{#if d.thumbnail}
									<img
										src={d.thumbnail}
										alt="Preview of {d.title}"
										class="max-h-full max-w-full rounded-sm shadow-page"
										loading="lazy"
									/>
								{:else}
									<div
										class="rounded-sm bg-white shadow-page"
										style={tileBox(d.width, d.height, 120)}
									></div>
								{/if}
							</div>
							<h3 class="mt-2.5 truncate text-sm font-medium">{d.title}</h3>
							<p class="text-xs text-muted tabular-nums">
								{d.width} × {d.height} · {ago(d.updatedAt)}
							</p>
						</a>
						<DropdownMenu.Root>
							<DropdownMenu.Trigger
								class="absolute top-2.5 right-2.5 grid size-8 place-items-center rounded-lg bg-white/95 opacity-0 shadow-soft ring-1 ring-line transition group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100"
								aria-label="Options for {d.title}"
							>
								<MoreHorizontal class="size-4" weight="bold" />
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
										class="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-brand-600 data-highlighted:bg-brand-50"
										onSelect={() => remove(d.id)}
									>
										<Trash2 class="size-4" /> Delete
									</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Portal>
						</DropdownMenu.Root>
					</article>
				{/each}
			</div>
		{/if}
	</section>
</main>
