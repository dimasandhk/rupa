<script lang="ts">
	import {
		ChevronLeft,
		CloudUpload,
		Image,
		Layers,
		LayoutTemplate,
		Shapes,
		Type
	} from '@lucide/svelte';
	import type { Component } from 'svelte';
	import ElementsPanel from './panels/ElementsPanel.svelte';
	import LayersPanel from './panels/LayersPanel.svelte';
	import PhotosPanel from './panels/PhotosPanel.svelte';
	import TemplatesPanel from './panels/TemplatesPanel.svelte';
	import TextPanel from './panels/TextPanel.svelte';
	import UploadsPanel from './panels/UploadsPanel.svelte';

	let { onerror }: { onerror: (m: string) => void } = $props();

	type Tab = 'templates' | 'elements' | 'text' | 'uploads' | 'photos' | 'layers';
	const TABS: { id: Tab; label: string; icon: Component }[] = [
		{ id: 'templates', label: 'Design', icon: LayoutTemplate },
		{ id: 'elements', label: 'Elements', icon: Shapes },
		{ id: 'text', label: 'Text', icon: Type },
		{ id: 'uploads', label: 'Uploads', icon: CloudUpload },
		{ id: 'photos', label: 'Photos', icon: Image },
		{ id: 'layers', label: 'Layers', icon: Layers }
	];

	let tab = $state<Tab | null>('elements');
</script>

<nav
	class="flex w-[72px] shrink-0 flex-col items-center gap-1 bg-[#18191b] py-2 text-white"
	aria-label="Side panels"
>
	{#each TABS as t (t.id)}
		<button
			class="flex w-16 flex-col items-center gap-1 rounded-lg py-2 text-[11px] hover:text-white {tab ===
			t.id
				? 'bg-[#252627] text-white'
				: 'text-white/70'}"
			aria-pressed={tab === t.id}
			onclick={() => (tab = tab === t.id ? null : t.id)}
		>
			<t.icon class="size-5" />
			{t.label}
		</button>
	{/each}
</nav>

{#if tab}
	<aside class="relative flex w-80 shrink-0 flex-col border-r border-line bg-white">
		<div class="min-h-0 flex-1 overflow-y-auto p-4">
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
		<button
			class="absolute top-1/2 -right-4 z-10 grid h-16 w-4 -translate-y-1/2 place-items-center rounded-r-lg border border-l-0 border-line bg-white text-muted hover:text-ink"
			title="Hide panel"
			onclick={() => (tab = null)}
		>
			<ChevronLeft class="size-3.5" />
		</button>
	</aside>
{/if}
