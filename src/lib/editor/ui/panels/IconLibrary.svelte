<script lang="ts">
	import { Search } from '#lib/icons.ts';
	import { svgToDataUrl } from '../../canvas/images';
	import { getEditor } from '../../context';
	import {
		ICON_SOURCES,
		iconSetInfo,
		searchIcons,
		type Graphic,
		type IconSetInfo
	} from '../../iconify';
	import { addIcon } from '../../insert';

	const editor = getEditor();
	const PAGE = 48;

	let query = $state('');
	let searched = $state('star');
	let sourceId = $state('all');
	let limit = $state(PAGE);
	let icons = $state<Graphic[]>([]);
	let loading = $state(false);
	let error = $state('');
	let exhausted = $state(false);
	let info = $state<Record<string, IconSetInfo>>({});

	const source = $derived(ICON_SOURCES.find((s) => s.id === sourceId)!);

	$effect(() => {
		iconSetInfo().then((i) => (info = i));
	});

	// Re-run whenever the query, source or page size changes.
	$effect(() => {
		const [q, src, lim] = [searched, source, limit];
		let cancelled = false;
		loading = true;
		error = '';
		searchIcons(q, src, lim)
			.then((list) => {
				if (cancelled) return;
				icons = list;
				exhausted = list.length < lim;
				if (!list.length) error = 'No graphics found. Try another word or style.';
			})
			.catch(
				(e) => !cancelled && (error = (e as Error).message || 'Could not reach the icon library')
			)
			.finally(() => !cancelled && (loading = false));
		return () => (cancelled = true);
	});

	function credit(id: string) {
		const [prefix, name] = id.split(':');
		const set = info[prefix];
		return set
			? `${name.replaceAll('-', ' ')} · ${set.name} (${set.license})`
			: name.replaceAll('-', ' ');
	}

	function insert(g: Graphic) {
		const [prefix, name] = g.id.split(':');
		addIcon(editor, g.svg, `${info[prefix]?.name ?? prefix}: ${name.replaceAll('-', ' ')}`);
	}
</script>

<form
	class="relative mb-2"
	onsubmit={(e) => {
		e.preventDefault();
		if (query.trim()) {
			searched = query.trim();
			limit = PAGE;
		}
	}}
>
	<Search class="pointer-events-none absolute top-2.5 left-3 size-4 text-muted" />
	<input bind:value={query} placeholder="Search icons & stickers" class="input pl-9" />
</form>

<div
	class="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1"
	role="tablist"
	aria-label="Icon style"
>
	{#each ICON_SOURCES as s (s.id)}
		<button
			role="tab"
			aria-selected={sourceId === s.id}
			class="h-7 shrink-0 rounded-full px-3 text-xs font-medium transition {sourceId === s.id
				? 'bg-ink text-paper'
				: 'bg-gray-100 text-ink/75 hover:bg-gray-200'}"
			onclick={() => {
				sourceId = s.id;
				limit = PAGE;
			}}>{s.label}</button
		>
	{/each}
</div>

{#if error && !icons.length}
	<p class="py-4 text-center text-sm text-muted">{error}</p>
{:else}
	<div class="grid grid-cols-4 gap-2" aria-busy={loading}>
		{#each icons as icon (icon.id)}
			<button
				class="grid aspect-square place-items-center rounded-lg p-2 transition hover:bg-gray-100 active:scale-95"
				title={credit(icon.id)}
				onclick={() => insert(icon)}
			>
				<img
					src={svgToDataUrl(icon.svg, '#1f1b17')}
					alt={credit(icon.id)}
					class="size-10"
					loading="lazy"
				/>
			</button>
		{/each}
		{#if loading}
			{#each { length: icons.length ? 4 : 12 }, i (i)}
				<span class="aspect-square animate-pulse rounded-lg bg-gray-100"></span>
			{/each}
		{/if}
	</div>
	{#if icons.length && !exhausted && !loading}
		<button class="mt-3 btn-outline w-full" onclick={() => (limit = Math.min(999, limit + PAGE))}
			>Load more</button
		>
	{/if}
{/if}
<p class="mt-3 text-[11px] leading-relaxed text-muted">
	Open-source icons from {source.prefixes.length} sets via
	<a href="https://iconify.design" target="_blank" rel="noopener noreferrer" class="underline"
		>Iconify</a
	>. Hover an icon to see its set and license; CC-BY sets ask for credit when you publish.
</p>
