<script lang="ts" module>
	import { linearGradient } from '../../color/color';
	import type { Gradient } from '../../model/types';

	const PALETTE = [
		'#000000',
		'#545454',
		'#737373',
		'#a6a6a6',
		'#d9d9d9',
		'#ffffff',
		'#ff3131',
		'#ff5757',
		'#ff66c4',
		'#cb6ce6',
		'#8c52ff',
		'#5e17eb',
		'#0097b2',
		'#0cc0df',
		'#5ce1e6',
		'#38b6ff',
		'#5271ff',
		'#004aad',
		'#00bf63',
		'#7ed957',
		'#c1ff72',
		'#ffde59',
		'#ffbd59',
		'#ff914d'
	];

	const GRADIENTS: Gradient[] = [
		linearGradient(['#1f1b17', '#776b61']),
		linearGradient(['#c2553a', '#f2b48c']),
		linearGradient(['#5fb4ff', '#76ffc9']),
		linearGradient(['#0d2b45', '#4caf88']),
		linearGradient(['#89d957', '#c9e265']),
		linearGradient(['#7b2d9f', '#fdd82e'], 180),
		linearGradient(['#ff3131', '#ff914d']),
		linearGradient(['#ff5757', '#8c52ff']),
		linearGradient(['#004aad', '#cb6ce6']),
		linearGradient(['#0097b2', '#7ed957']),
		linearGradient(['#ffde59', '#ff914d']),
		linearGradient(['#fff7ad', '#ffa9f9'])
	];

	/** Gradient directions offered as quick buttons (CSS angles), plus radial. */
	const STYLES: { label: string; angle: number; radial?: boolean }[] = [
		{ label: 'Left to right', angle: 90 },
		{ label: 'Top to bottom', angle: 180 },
		{ label: 'Diagonal down', angle: 135 },
		{ label: 'Diagonal up', angle: 45 },
		{ label: 'Radial', angle: 0, radial: true }
	];
</script>

<script lang="ts">
	import { Plus, X } from '#lib/icons.ts';
	import type { Snippet } from 'svelte';
	import { untrack } from 'svelte';
	import { fillToCss, isGradient, primaryColor, sameFill } from '../../color/color';
	import {
		colorSources,
		pagePalettes,
		suggestGradients,
		type SourcePalette
	} from '../../color/suggest';
	import { getEditor } from '../../context';
	import type { Element, Fill } from '../../model/types';
	import Pop from './Pop.svelte';

	let {
		value,
		title = 'Color',
		onchange,
		onfill,
		icon
	}: {
		value: Fill;
		title?: string;
		/** Solid-only callers: receives a hex colour. */
		onchange?: (color: string) => void;
		/** Gradient-capable callers: receives a colour or gradient (enables the Gradient tab). */
		onfill?: (fill: Fill) => void;
		/** Custom trigger content (e.g. the "A" with a color bar for text). */
		icon?: Snippet;
	} = $props();

	const editor = getEditor();
	const allowGradient = $derived(!!onfill);

	let open = $state(false);
	// svelte-ignore state_referenced_locally
	let mode = $state<'solid' | 'gradient'>(isGradient(value) ? 'gradient' : 'solid');
	$effect(() => {
		if (open) mode = untrack(() => (isGradient(value) && allowGradient ? 'gradient' : 'solid'));
	});

	function emit(fill: Fill) {
		if (onfill) onfill(fill);
		else if (!isGradient(fill)) onchange?.(fill);
	}
	function pick(fill: Fill) {
		emit(fill);
		editor.sealHistory();
	}

	// ---- colours already used in the design (Canva's "Document colors")
	const used = $derived.by(() => {
		const solids = new Map<string, number>();
		const gradients = new Map<string, Gradient>();
		const add = (f?: Fill) => {
			if (!f || f === 'transparent') return;
			if (isGradient(f)) gradients.set(fillToCss(f).toLowerCase(), f);
			else solids.set(f.toLowerCase(), (solids.get(f.toLowerCase()) ?? 0) + 1);
		};
		const visit = (els: Element[]) => {
			for (const el of els) {
				if (el.type === 'text' || el.type === 'shape') add(el.fill);
				else if (el.type === 'line') add(el.stroke);
				else if (el.type === 'icon') add(el.color);
				else if (el.type === 'group') visit(el.children);
			}
		};
		for (const p of editor.data.pages) {
			add(p.background.color);
			visit(p.elements);
		}
		return {
			solids: [...solids.entries()]
				.sort((a, b) => b[1] - a[1])
				.map(([c]) => c)
				.slice(0, 14),
			gradients: [...gradients.values()].slice(0, 8)
		};
	});

	// ---- colours pulled from the photos and graphics on this page
	let palettes = $state<SourcePalette[]>([]);
	let loadingPalettes = $state(false);
	const sourceKey = $derived(
		colorSources(editor.activePage)
			.map((s) => s.key)
			.join('|')
	);
	$effect(() => {
		if (!open || !sourceKey) {
			if (!sourceKey) palettes = [];
			return;
		}
		let cancelled = false;
		loadingPalettes = true;
		pagePalettes(untrack(() => editor.activePage)).then((p) => {
			if (cancelled) return;
			palettes = p;
			loadingPalettes = false;
		});
		return () => (cancelled = true);
	});
	const pageGradients = $derived(suggestGradients(palettes));
	const sourceCount = $derived(sourceKey ? sourceKey.split('|').length : 0);

	// ---- gradient editing
	const working: Gradient = $derived(
		isGradient(value)
			? value
			: linearGradient([
					primaryColor(value) === 'transparent' ? '#1f1b17' : primaryColor(value),
					palettes[0]?.colors[0] ?? '#f2b48c'
				])
	);

	function editGradient(recipe: (g: Gradient) => void, key = true) {
		const g: Gradient = structuredClone($state.snapshot(working)) as Gradient;
		recipe(g);
		g.stops.sort((a, b) => a.offset - b.offset);
		if (key) emit(g);
		else pick(g);
	}

	function addStop() {
		editGradient((g) => {
			if (g.stops.length >= 5) return;
			// Insert into the widest gap so the new colour lands somewhere visible.
			let gi = 0;
			for (let i = 1; i < g.stops.length - 1; i++) {
				if (g.stops[i + 1].offset - g.stops[i].offset > g.stops[gi + 1].offset - g.stops[gi].offset)
					gi = i;
			}
			const offset = (g.stops[gi].offset + g.stops[gi + 1].offset) / 2;
			g.stops.push({ offset, color: g.stops[gi].color });
		}, false);
	}

	function commitHex(v: string) {
		const m = v.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
		if (m) pick(`#${m[1].toLowerCase()}`);
	}

	const solidValue = $derived(isGradient(value) ? primaryColor(value) : value);
</script>

{#snippet swatch(c: Fill, label?: string)}
	{@const selected = sameFill(c, value)}
	<button
		class="size-7 rounded-full border border-black/10 transition duration-200 ease-(--ease-spring) hover:scale-110 active:scale-95 {selected
			? 'ring-2 ring-brand ring-offset-1'
			: ''}"
		style:background={fillToCss(c)}
		title={label ?? (isGradient(c) ? 'Gradient' : c)}
		aria-label={label ??
			(isGradient(c) ? `Gradient ${c.stops.map((s) => s.color).join(' to ')}` : c)}
		aria-pressed={selected}
		onclick={() => pick(c)}
	></button>
{/snippet}

{#snippet section(label: string, hint?: string)}
	<div class="mb-1.5 flex items-baseline gap-2">
		<span class="text-xs font-semibold text-ink">{label}</span>
		{#if hint}<span class="text-[11px] text-muted">{hint}</span>{/if}
	</div>
{/snippet}

{#snippet fromThisPage(kind: 'solid' | 'gradient')}
	{#if sourceCount}
		<div>
			{@render section(
				'From this page',
				kind === 'solid' ? 'colors in your photos & graphics' : 'built from your photos & graphics'
			)}
			{#if loadingPalettes && !palettes.length}
				<div class="flex gap-1.5">
					{#each { length: 6 }, i (i)}<span class="size-7 animate-pulse rounded-full bg-gray-100"
						></span>{/each}
				</div>
			{:else if kind === 'solid'}
				<div class="space-y-1.5">
					{#each palettes as p (p.key)}
						<div class="flex items-center gap-1.5">
							<img
								src={p.src}
								alt="{p.label} on this page"
								title={p.label}
								class="size-7 shrink-0 rounded-md bg-gray-100 object-cover ring-1 ring-line"
							/>
							<span class="mx-0.5 h-4 w-px bg-line" aria-hidden="true"></span>
							{#each p.colors as c (c)}{@render swatch(c)}{/each}
						</div>
					{/each}
				</div>
			{:else if pageGradients.length}
				<div class="grid grid-cols-7 gap-1.5">
					{#each pageGradients as g (fillToCss(g))}{@render swatch(g)}{/each}
				</div>
			{:else}
				<p class="text-[11px] text-muted">
					Add a photo with two or more colors to get suggestions.
				</p>
			{/if}
		</div>
	{/if}
{/snippet}

<Pop {title} triggerClass="icon-btn" width={300} bind:open>
	{#snippet trigger()}
		{#if icon}
			{@render icon()}
		{:else}
			<span class="size-6 rounded-full border border-black/15" style:background={fillToCss(value)}
			></span>
		{/if}
	{/snippet}
	<div class="space-y-4">
		{#if allowGradient}
			<div class="grid grid-cols-2 rounded-lg bg-gray-100 p-0.5 text-xs font-medium" role="tablist">
				{#each ['solid', 'gradient'] as const as m (m)}
					<button
						role="tab"
						aria-selected={mode === m}
						class="h-7 rounded-md capitalize transition {mode === m
							? 'bg-white text-ink shadow-soft'
							: 'text-muted hover:text-ink'}"
						onclick={() => (mode = m)}>{m}</button
					>
				{/each}
			</div>
		{/if}

		{#if mode === 'solid' || !allowGradient}
			<div class="flex items-center gap-2">
				<label
					class="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-full border border-line"
					title="Custom color"
					style="background: conic-gradient(red, yellow, lime, aqua, blue, magenta, red)"
				>
					<input
						type="color"
						class="absolute inset-0 cursor-pointer opacity-0"
						value={/^#[0-9a-f]{6}$/i.test(solidValue) ? solidValue : '#000000'}
						oninput={(e) => emit(e.currentTarget.value)}
						onchange={() => editor.sealHistory()}
					/>
				</label>
				<input
					class="input font-mono uppercase"
					value={solidValue}
					maxlength="7"
					onchange={(e) => commitHex(e.currentTarget.value)}
					aria-label="Hex color"
				/>
			</div>
			{@render fromThisPage('solid')}
			{#if used.solids.length}
				<div>
					{@render section('In this design')}
					<div class="grid grid-cols-7 gap-1.5">
						{#each used.solids as c (c)}{@render swatch(c)}{/each}
					</div>
				</div>
			{/if}
			<div>
				{@render section('Default colors')}
				<div class="grid grid-cols-7 gap-1.5">
					{#each PALETTE as c (c)}{@render swatch(c)}{/each}
				</div>
			</div>
		{:else}
			<!-- Gradient editor -->
			<div class="space-y-2.5">
				<div
					class="h-9 rounded-lg ring-1 ring-black/10"
					style:background={fillToCss(working)}
				></div>
				<div class="flex flex-wrap items-center gap-1.5">
					{#each working.stops as stop, i (i)}
						<div class="group/stop relative">
							<label
								class="block size-8 cursor-pointer rounded-lg ring-1 ring-black/10 transition hover:scale-105"
								style:background={stop.color}
								title="Color {i + 1}: {stop.color}"
							>
								<input
									type="color"
									class="absolute inset-0 cursor-pointer opacity-0"
									value={stop.color}
									aria-label="Gradient color {i + 1}"
									oninput={(e) => {
										const color = e.currentTarget.value;
										editGradient((g) => (g.stops[i].color = color));
									}}
									onchange={() => editor.sealHistory()}
								/>
							</label>
							{#if working.stops.length > 2}
								<button
									class="absolute -top-1.5 -right-1.5 hidden size-4 place-items-center rounded-full bg-ink text-paper group-hover/stop:grid focus:grid"
									aria-label="Remove color {i + 1}"
									onclick={() => editGradient((g) => g.stops.splice(i, 1), false)}
									><X class="size-2.5" weight="bold" /></button
								>
							{/if}
						</div>
					{/each}
					{#if working.stops.length < 5}
						<button
							class="grid size-8 place-items-center rounded-lg border border-dashed border-ink/25 text-muted hover:border-brand hover:text-brand"
							title="Add a color"
							onclick={addStop}
						>
							<Plus class="size-4" />
						</button>
					{/if}
					<button
						class="ml-auto text-xs font-medium text-muted underline decoration-line underline-offset-4 hover:text-ink"
						onclick={() =>
							editGradient((g) => {
								for (const s of g.stops) s.offset = 1 - s.offset;
							}, false)}>Reverse</button
					>
				</div>
				<div class="flex items-center gap-1.5">
					<span class="mr-1 text-xs text-muted">Style</span>
					{#each STYLES as st (st.label)}
						{@const active = st.radial
							? working.type === 'radial'
							: working.type === 'linear' && working.angle === st.angle}
						<button
							class="size-8 rounded-lg ring-1 transition {active
								? 'ring-2 ring-brand'
								: 'ring-black/10 hover:ring-black/25'}"
							style:background={st.radial
								? `radial-gradient(circle, ${working.stops[0].color}, ${working.stops.at(-1)?.color})`
								: `linear-gradient(${st.angle}deg, ${working.stops[0].color}, ${working.stops.at(-1)?.color})`}
							title={st.label}
							aria-label="{st.label} gradient"
							aria-pressed={active}
							onclick={() =>
								editGradient((g) => {
									g.type = st.radial ? 'radial' : 'linear';
									if (!st.radial) g.angle = st.angle;
								}, false)}
						></button>
					{/each}
				</div>
				{#if working.type === 'linear'}
					<label class="flex items-center gap-3 text-xs text-muted">
						Angle
						<input
							type="range"
							min="0"
							max="359"
							value={working.angle}
							class="h-1.5 min-w-0 flex-1 accent-brand"
							oninput={(e) => {
								const angle = Number(e.currentTarget.value);
								editGradient((g) => (g.angle = angle));
							}}
							onchange={() => editor.sealHistory()}
						/>
						<span class="w-9 text-right text-ink tabular-nums">{working.angle}°</span>
					</label>
				{/if}
			</div>
			{@render fromThisPage('gradient')}
			{#if used.gradients.length}
				<div>
					{@render section('In this design')}
					<div class="grid grid-cols-7 gap-1.5">
						{#each used.gradients as g (fillToCss(g))}{@render swatch(g)}{/each}
					</div>
				</div>
			{/if}
			<div>
				{@render section('Default gradients')}
				<div class="grid grid-cols-7 gap-1.5">
					{#each GRADIENTS as g (fillToCss(g))}{@render swatch(g)}{/each}
				</div>
			</div>
		{/if}
	</div>
</Pop>
