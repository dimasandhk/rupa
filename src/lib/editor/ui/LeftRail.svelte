<script lang="ts">
	import { CloudUpload, Image, Layers, LayoutTemplate, Shapes, Type, X } from '#lib/icons.ts';
	import type { Component } from 'svelte';
	import { cubicOut } from 'svelte/easing';
	import { fly } from 'svelte/transition';
	import ElementsPanel from './panels/ElementsPanel.svelte';
	import LayersPanel from './panels/LayersPanel.svelte';
	import PhotosPanel from './panels/PhotosPanel.svelte';
	import TemplatesPanel from './panels/TemplatesPanel.svelte';
	import TextPanel from './panels/TextPanel.svelte';
	import UploadsPanel from './panels/UploadsPanel.svelte';

	let { onerror }: { onerror: (m: string) => void } = $props();

	type Tab = 'templates' | 'elements' | 'text' | 'uploads' | 'photos' | 'layers';
	const TABS: { id: Tab; label: string; hint: string; icon: Component }[] = [
		{
			id: 'templates',
			label: 'Templates',
			hint: 'Start from a finished layout',
			icon: LayoutTemplate
		},
		{ id: 'elements', label: 'Elements', hint: 'Shapes, lines and graphics', icon: Shapes },
		{ id: 'text', label: 'Text', hint: 'Type styles and pairings', icon: Type },
		{ id: 'uploads', label: 'Uploads', hint: 'Images from your computer', icon: CloudUpload },
		{ id: 'photos', label: 'Photos', hint: 'Free stock photography', icon: Image },
		{ id: 'layers', label: 'Layers', hint: 'Stacking order on this page', icon: Layers }
	];

	let tab = $state<Tab | null>('elements');
	const current = $derived(TABS.find((t) => t.id === tab));
</script>

<nav class="flex w-16 shrink-0 flex-col items-center gap-1 pt-1" aria-label="Side panels">
	{#each TABS as t (t.id)}
		{@const active = tab === t.id}
		<button
			class="group flex w-14 flex-col items-center gap-1 py-1.5 text-[11px] font-medium transition {active
				? 'text-ink'
				: 'text-muted hover:text-ink'}"
			aria-pressed={active}
			onclick={() => (tab = active ? null : t.id)}
		>
			<span
				class="grid size-10 place-items-center rounded-xl transition duration-200 ease-(--ease-spring) group-active:scale-95 {active
					? 'bg-white text-brand shadow-soft ring-1 ring-line'
					: 'group-hover:bg-ink/[0.05]'}"
			>
				<t.icon class="size-5" weight={active ? 'fill' : 'regular'} />
			</span>
			{t.label}
		</button>
	{/each}
</nav>

{#if current}
	<aside
		class="flex w-80 shrink-0 flex-col overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-line"
		aria-label="{current.label} panel"
		transition:fly={{ x: -10, duration: 200, easing: cubicOut }}
	>
		<header class="flex items-start gap-2 px-4 pt-4 pb-2">
			<div class="min-w-0 flex-1">
				<h2 class="font-display text-xl font-medium">{current.label}</h2>
				<p class="text-xs text-muted">{current.hint}</p>
			</div>
			<button class="icon-btn size-8" title="Close panel" onclick={() => (tab = null)}>
				<X class="size-4" />
			</button>
		</header>
		<div class="min-h-0 flex-1 overflow-y-auto px-4 pt-2 pb-4">
			{#if tab === 'templates'}
				<TemplatesPanel {onerror} />
			{:else if tab === 'elements'}
				<ElementsPanel />
			{:else if tab === 'text'}
				<TextPanel />
			{:else if tab === 'uploads'}
				<UploadsPanel {onerror} />
			{:else if tab === 'photos'}
				<PhotosPanel {onerror} />
			{:else}
				<LayersPanel />
			{/if}
		</div>
	</aside>
{/if}
