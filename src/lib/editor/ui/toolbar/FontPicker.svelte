<script lang="ts">
	import { ChevronDown, Search } from '#lib/icons.ts';
	import { listFonts, previewFont, type FontInfo } from '../../canvas/fonts';
	import Pop from '../widgets/Pop.svelte';

	let { value, onchange }: { value: string; onchange: (family: string) => void } = $props();

	const POPULAR = [
		'Inter',
		'Roboto',
		'Open Sans',
		'Montserrat',
		'Poppins',
		'Lato',
		'Playfair Display',
		'Oswald',
		'Raleway',
		'Merriweather',
		'Bebas Neue',
		'Anton',
		'Pacifico',
		'Lobster',
		'Dancing Script',
		'Great Vibes',
		'Abril Fatface',
		'DM Serif Display',
		'Archivo Black',
		'League Spartan',
		'Nunito',
		'Quicksand',
		'Caveat',
		'Permanent Marker',
		'Space Grotesk'
	];

	let open = $state(false);
	let query = $state('');
	let fonts = $state<FontInfo[]>([]);

	$effect(() => {
		if (open && !fonts.length) listFonts().then((f) => (fonts = f));
	});

	const results = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) {
			const popular = POPULAR.map((family) => ({ family, category: '' }));
			const rest = fonts.filter((f) => !POPULAR.includes(f.family)).slice(0, 150);
			return [...popular, ...rest];
		}
		return fonts.filter((f) => f.family.toLowerCase().includes(q)).slice(0, 150);
	});

	/** Load a font for its preview only once its row scrolls into view. */
	function preview(node: HTMLElement, family: string) {
		const io = new IntersectionObserver((entries) => {
			if (entries.some((e) => e.isIntersecting)) {
				previewFont(family);
				io.disconnect();
			}
		});
		io.observe(node);
		return { destroy: () => io.disconnect() };
	}
</script>

<Pop title="Font" bind:open triggerClass="btn-outline w-44 justify-between" width={300}>
	{#snippet trigger()}
		<span class="truncate" style:font-family={`"${value}"`}>{value}</span>
		<ChevronDown class="size-4 shrink-0 text-muted" />
	{/snippet}
	<label class="relative mb-2 block">
		<Search class="pointer-events-none absolute top-2.5 left-3 size-4 text-muted" />
		<!-- svelte-ignore a11y_autofocus -->
		<input bind:value={query} placeholder="Search fonts" class="input pl-9" autofocus />
	</label>
	<div class="-mx-1 max-h-80 overflow-y-auto">
		{#if !query}<div class="px-2 py-1 text-xs font-semibold text-muted">Popular fonts</div>{/if}
		{#each results as f (f.family)}
			<button
				use:preview={f.family}
				class="flex w-full items-center rounded-lg px-2 py-1.5 text-left text-[15px] hover:bg-gray-100"
				class:bg-brand-50={f.family === value}
				style:font-family={`"${f.family}", sans-serif`}
				onclick={() => {
					onchange(f.family);
					open = false;
				}}
			>
				{f.family}
			</button>
		{:else}
			<p class="p-3 text-sm text-muted">{fonts.length ? 'No fonts found' : 'Loading fonts…'}</p>
		{/each}
	</div>
</Pop>
