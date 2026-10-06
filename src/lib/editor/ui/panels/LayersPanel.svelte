<script lang="ts">
	import { ChevronDown, ChevronUp, Lock, LockOpen } from '#lib/icons.ts';
	import { SHAPE_LABELS } from '../../canvas/shapes';
	import { getEditor } from '../../context';
	import type { Element } from '../../model/types';

	const editor = getEditor();
	// Top-most layer first, like Canva's Layers tab.
	const layers = $derived([...editor.activePage.elements].reverse());

	function label(el: Element): string {
		if (el.name) return el.name;
		switch (el.type) {
			case 'text':
				return el.text.split('\n')[0].slice(0, 40) || 'Text';
			case 'shape':
				return SHAPE_LABELS[el.shape];
			case 'image':
				return 'Image';
			case 'line':
				return 'Line';
			case 'icon':
				return 'Graphic';
			case 'frame':
				return el.image ? 'Frame' : 'Empty frame';
			case 'group':
				return `Group (${el.children.length})`;
		}
	}

	function move(id: string, dir: 1 | -1) {
		editor.select([id]);
		editor.reorder(dir > 0 ? 'forward' : 'backward');
	}
</script>

<div class="panel-title">Layers on page {editor.activePageIndex + 1}</div>
{#if !layers.length}
	<p class="py-6 text-center text-sm text-muted">This page is empty.</p>
{/if}
<ul class="space-y-1">
	{#each layers as el, i (el.id)}
		{@const selected = editor.selectedIds.includes(el.id)}
		<li
			class="group flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm"
			class:border-brand={selected}
			class:bg-brand-50={selected}
			class:border-line={!selected}
		>
			<button
				class="min-w-0 flex-1 truncate text-left"
				class:opacity-60={el.locked}
				onclick={(e) => (e.shiftKey ? editor.toggleSelect(el.id) : editor.select([el.id]))}
			>
				<span class="mr-1 text-xs text-muted uppercase">{el.type}</span>
				{label(el)}
			</button>
			<button
				class="icon-btn size-6 opacity-0 group-hover:opacity-100"
				title="Bring forward"
				disabled={i === 0}
				onclick={() => move(el.id, 1)}><ChevronUp class="size-3.5" /></button
			>
			<button
				class="icon-btn size-6 opacity-0 group-hover:opacity-100"
				title="Send backward"
				disabled={i === layers.length - 1}
				onclick={() => move(el.id, -1)}><ChevronDown class="size-3.5" /></button
			>
			<button
				class="icon-btn size-6 {el.locked ? '' : 'opacity-0 group-hover:opacity-100'}"
				title={el.locked ? 'Unlock' : 'Lock'}
				onclick={() => editor.updateElements([el.id], (e) => (e.locked = !e.locked))}
			>
				{#if el.locked}<Lock class="size-3.5" />{:else}<LockOpen class="size-3.5" />{/if}
			</button>
		</li>
	{/each}
</ul>
