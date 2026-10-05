<script lang="ts">
	import { LoaderCircle, Search } from '@lucide/svelte';
	import { POLYGONS, PATHS, SHAPE_LABELS } from '../../canvas/shapes';
	import { getEditor } from '../../context';
	import { addIcon, addLine, addShape } from '../../insert';
	import type { ShapeKind } from '../../model/types';

	const editor = getEditor();
	const SHAPES = Object.keys(SHAPE_LABELS) as ShapeKind[];

	/** SVG preview of a shape in a 0..100 box. */
	function preview(kind: ShapeKind) {
		if (kind === 'rect') return '<rect x="6" y="6" width="88" height="88"/>';
		if (kind === 'ellipse') return '<circle cx="50" cy="50" r="44"/>';
		if (PATHS[kind]) return `<path d="${PATHS[kind]}"/>`;
		const pts = POLYGONS[kind]!;
		const coords = [];
		for (let i = 0; i < pts.length; i += 2)
			coords.push(`${6 + pts[i] * 88},${6 + pts[i + 1] * 88}`);
		return `<polygon points="${coords.join(' ')}"/>`;
	}

	// ---- Icons via the Iconify API (100k+ open-source icons, no key needed)
	let query = $state('');
	let icons = $state<string[]>([]);
	let loading = $state(false);
	let error = $state('');
	const COLLECTIONS = 'mdi,ph,tabler,lucide,fluent-emoji-flat,noto,twemoji,logos';

	async function search(q: string) {
		if (!q.trim()) return;
		loading = true;
		error = '';
		try {
			const res = await fetch(
				`https://api.iconify.design/search?query=${encodeURIComponent(q.trim())}&limit=96&prefixes=${COLLECTIONS}`
			);
			const body = await res.json();
			icons = body.icons ?? [];
			if (!icons.length) error = 'No graphics found';
		} catch {
			error = 'Could not reach the icon library';
		} finally {
			loading = false;
		}
	}

	async function insertIcon(name: string) {
		const [prefix, id] = name.split(':');
		const res = await fetch(`https://api.iconify.design/${prefix}/${id}.svg?width=256&height=256`);
		addIcon(editor, await res.text());
	}

	$effect(() => {
		search('star');
	});
</script>

<div class="space-y-5">
	<section>
		<div class="panel-title">Shapes</div>
		<div class="grid grid-cols-4 gap-2">
			{#each SHAPES as kind (kind)}
				<button
					class="grid aspect-square place-items-center rounded-lg p-2 hover:bg-gray-100"
					title={SHAPE_LABELS[kind]}
					onclick={() => addShape(editor, kind)}
				>
					<!-- eslint-disable-next-line svelte/no-at-html-tags -- markup built from our own static shape table -->
					<svg viewBox="0 0 100 100" class="size-full fill-[#a6a6a6]">{@html preview(kind)}</svg>
				</button>
			{/each}
		</div>
	</section>

	<section>
		<div class="panel-title">Lines</div>
		<div class="grid grid-cols-4 gap-2">
			{#each [{ label: 'Line', p: {} }, { label: 'Arrow', p: { endArrow: true } }, { label: 'Dashed', p: { dash: 'dashed' as const } }, { label: 'Dotted', p: { dash: 'dotted' as const } }] as l (l.label)}
				<button
					class="grid h-14 place-items-center rounded-lg px-2 hover:bg-gray-100"
					title={l.label}
					onclick={() => addLine(editor, l.p)}
				>
					<svg viewBox="0 0 60 10" class="w-full stroke-ink" stroke-width="2.5">
						<line
							x1="2"
							y1="5"
							x2={'endArrow' in l.p ? 52 : 58}
							y2="5"
							stroke-dasharray={'dash' in l.p
								? l.p.dash === 'dashed'
									? '6 4'
									: '0.1 5'
								: undefined}
							stroke-linecap="round"
						/>
						{#if 'endArrow' in l.p}<polygon
								points="50,1 58,5 50,9"
								class="fill-ink"
								stroke="none"
							/>{/if}
					</svg>
				</button>
			{/each}
		</div>
	</section>

	<section>
		<div class="panel-title">Graphics</div>
		<form
			class="relative mb-2"
			onsubmit={(e) => {
				e.preventDefault();
				search(query);
			}}
		>
			<Search class="pointer-events-none absolute top-2.5 left-3 size-4 text-muted" />
			<input bind:value={query} placeholder="Search icons & stickers" class="input pl-9" />
		</form>
		{#if loading}
			<div class="grid place-items-center py-6">
				<LoaderCircle class="size-5 animate-spin text-muted" />
			</div>
		{:else if error}
			<p class="py-4 text-center text-sm text-muted">{error}</p>
		{:else}
			<div class="grid grid-cols-4 gap-2">
				{#each icons as name (name)}
					<button
						class="grid aspect-square place-items-center rounded-lg p-2 hover:bg-gray-100"
						title={name}
						onclick={() => insertIcon(name)}
					>
						<img
							src="https://api.iconify.design/{name.replace(':', '/')}.svg?height=48"
							alt={name}
							class="size-10"
							loading="lazy"
						/>
					</button>
				{/each}
			</div>
			<p class="mt-2 text-[11px] text-muted">Icons from Iconify (open-source licenses).</p>
		{/if}
	</section>
</div>
