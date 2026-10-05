<script lang="ts">
	import {
		AlignCenterHorizontal,
		AlignCenterVertical,
		AlignEndHorizontal,
		AlignEndVertical,
		AlignHorizontalSpaceAround,
		AlignStartHorizontal,
		AlignStartVertical,
		AlignVerticalSpaceAround,
		ArrowDown,
		ArrowDownToLine,
		ArrowUp,
		ArrowUpToLine,
		Blend,
		Copy,
		Group,
		Lock,
		LockOpen,
		Trash2,
		Ungroup
	} from '#lib/icons.ts';
	import type { Alignment } from '../../commands/arrange';
	import { getEditor } from '../../context';
	import Pop from '../widgets/Pop.svelte';
	import RangeField from '../widgets/RangeField.svelte';

	const editor = getEditor();
	const els = $derived(editor.selectedElements);
	const locked = $derived(els.some((e) => e.locked));
	const opacity = $derived(Math.round((els[0]?.opacity ?? 1) * 100));

	// Canva's align buttons: x axis uses vertical-bar icons, y axis horizontal-bar icons.
	const ALIGN: { a: Alignment; label: string; icon: typeof AlignStartVertical }[] = [
		{ a: 'top', label: 'Top', icon: AlignStartHorizontal },
		{ a: 'left', label: 'Left', icon: AlignStartVertical },
		{ a: 'middle', label: 'Middle', icon: AlignCenterHorizontal },
		{ a: 'center', label: 'Center', icon: AlignCenterVertical },
		{ a: 'bottom', label: 'Bottom', icon: AlignEndHorizontal },
		{ a: 'right', label: 'Right', icon: AlignEndVertical }
	];
</script>

{#if els.length > 1}
	<button class="btn-ghost" onclick={() => editor.groupSelected()}
		><Group class="size-4" /> Group</button
	>
{:else if els[0]?.type === 'group'}
	<button class="btn-ghost" onclick={() => editor.ungroupSelected()}
		><Ungroup class="size-4" /> Ungroup</button
	>
{/if}

<Pop title="Position" triggerClass="btn-ghost" width={300} align="end">
	{#snippet trigger()}Position{/snippet}
	<div class="panel-title">Layer</div>
	<div class="grid grid-cols-2 gap-1">
		<button class="btn-ghost justify-start" onclick={() => editor.reorder('forward')}
			><ArrowUp class="size-4" /> Forward</button
		>
		<button class="btn-ghost justify-start" onclick={() => editor.reorder('backward')}
			><ArrowDown class="size-4" /> Backward</button
		>
		<button class="btn-ghost justify-start" onclick={() => editor.reorder('front')}
			><ArrowUpToLine class="size-4" /> To front</button
		>
		<button class="btn-ghost justify-start" onclick={() => editor.reorder('back')}
			><ArrowDownToLine class="size-4" /> To back</button
		>
	</div>
	<div class="mt-3 panel-title">Align {els.length > 1 ? 'elements' : 'to page'}</div>
	<div class="grid grid-cols-2 gap-1">
		{#each ALIGN as { a, label, icon: Icon } (a)}
			<button class="btn-ghost justify-start" disabled={locked} onclick={() => editor.align(a)}>
				<Icon class="size-4" />
				{label}
			</button>
		{/each}
	</div>
	{#if els.length > 2}
		<div class="mt-3 panel-title">Space evenly</div>
		<div class="grid grid-cols-2 gap-1">
			<button class="btn-ghost justify-start" onclick={() => editor.distribute('vertical')}
				><AlignVerticalSpaceAround class="size-4" /> Vertically</button
			>
			<button class="btn-ghost justify-start" onclick={() => editor.distribute('horizontal')}
				><AlignHorizontalSpaceAround class="size-4" /> Horizontally</button
			>
		</div>
	{/if}
</Pop>

<Pop title="Transparency" triggerClass="icon-btn" width={300} align="end">
	{#snippet trigger()}<Blend class="size-4" />{/snippet}
	<RangeField
		label="Transparency"
		value={opacity}
		min={0}
		max={100}
		oninput={(v) =>
			editor.updateSelected((e) => (e.opacity = v / 100), {
				key: `opacity:${editor.selectedIds.join()}`
			})}
		onchange={() => editor.sealHistory()}
	/>
</Pop>

<button
	class="icon-btn"
	title={locked ? 'Unlock' : 'Lock'}
	aria-pressed={locked}
	onclick={() => editor.toggleLock()}
>
	{#if locked}<Lock class="size-4" />{:else}<LockOpen class="size-4" />{/if}
</button>
<button class="icon-btn" title="Duplicate (Ctrl+D)" onclick={() => editor.duplicateSelected()}
	><Copy class="size-4" /></button
>
<button
	class="icon-btn"
	title="Delete (Del)"
	disabled={locked}
	onclick={() => editor.deleteSelected()}><Trash2 class="size-4" /></button
>
