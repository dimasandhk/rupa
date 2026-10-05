<script lang="ts">
	import { SquareDashed } from '#lib/icons.ts';
	import { getEditor } from '../../context';
	import type { IconElement, LineElement, ShapeElement } from '../../model/types';
	import ColorPicker from '../widgets/ColorPicker.svelte';
	import Pop from '../widgets/Pop.svelte';
	import RangeField from '../widgets/RangeField.svelte';

	let { el }: { el: ShapeElement | LineElement | IconElement } = $props();
	const editor = getEditor();

	function set<T>(recipe: (e: T) => void, key?: string) {
		const type = el.type;
		editor.updateSelected(
			(e) => {
				if (e.type === type) recipe(e as T);
			},
			key ? { key: `${key}:${editor.selectedIds.join()}` } : undefined
		);
	}
	const seal = () => editor.sealHistory();
</script>

{#if el.type === 'shape'}
	<ColorPicker
		title="Color"
		value={el.fill}
		onfill={(f) => set<ShapeElement>((s) => (s.fill = f), 'fill')}
	/>
	<Pop title="Border style" triggerClass="icon-btn" width={300}>
		{#snippet trigger()}<SquareDashed class="size-4" />{/snippet}
		<div class="mb-2 flex gap-2">
			{#each [['None', 0, false], ['Solid', 1, false], ['Dashed', 1, true]] as const as [label, on, dash] (label)}
				<button
					class="btn-outline flex-1 text-xs"
					class:!border-brand={(label === 'None' && el.strokeWidth === 0) ||
						(on && el.strokeWidth > 0 && el.dash === dash)}
					onclick={() =>
						set<ShapeElement>((s) => {
							if (!on) s.strokeWidth = 0;
							else {
								if (s.strokeWidth === 0)
									s.strokeWidth = Math.max(2, Math.min(s.width, s.height) * 0.02);
								s.dash = dash;
							}
						})}>{label}</button
				>
			{/each}
		</div>
		{#if el.strokeWidth > 0}
			<RangeField
				label="Border weight"
				value={el.strokeWidth}
				min={1}
				max={100}
				oninput={(v) => set<ShapeElement>((s) => (s.strokeWidth = v), 'sw')}
				onchange={seal}
			/>
			<div class="flex items-center gap-3 py-1">
				<span class="w-24 text-xs font-medium text-muted">Border color</span>
				<ColorPicker
					title="Border color"
					value={el.stroke}
					onchange={(c) => set<ShapeElement>((s) => (s.stroke = c), 'stroke')}
				/>
			</div>
		{/if}
		{#if el.shape === 'rect'}
			<RangeField
				label="Corner rounding"
				value={el.cornerRadius}
				min={0}
				max={Math.round(Math.min(el.width, el.height) / 2)}
				oninput={(v) => set<ShapeElement>((s) => (s.cornerRadius = v), 'radius')}
				onchange={seal}
			/>
		{/if}
	</Pop>
{:else if el.type === 'line'}
	<ColorPicker
		title="Line color"
		value={el.stroke}
		onchange={(c) => set<LineElement>((l) => (l.stroke = c), 'stroke')}
	/>
	<Pop title="Line style" triggerClass="icon-btn" width={300}>
		{#snippet trigger()}<SquareDashed class="size-4" />{/snippet}
		<div class="mb-2 flex gap-2">
			{#each ['solid', 'dashed', 'dotted'] as const as dash (dash)}
				<button
					class="btn-outline flex-1 text-xs capitalize"
					class:!border-brand={el.dash === dash}
					onclick={() => set<LineElement>((l) => (l.dash = dash))}>{dash}</button
				>
			{/each}
		</div>
		<RangeField
			label="Line weight"
			value={el.strokeWidth}
			min={1}
			max={100}
			oninput={(v) =>
				set<LineElement>((l) => {
					l.strokeWidth = v;
					l.height = v;
				}, 'sw')}
			onchange={seal}
		/>
	</Pop>
	<button
		class="btn-ghost"
		aria-pressed={el.startArrow}
		class:text-brand={el.startArrow}
		onclick={() => set<LineElement>((l) => (l.startArrow = !l.startArrow))}>←</button
	>
	<button
		class="btn-ghost"
		class:text-brand={el.endArrow}
		onclick={() => set<LineElement>((l) => (l.endArrow = !l.endArrow))}>→</button
	>
{:else}
	<ColorPicker
		title="Color"
		value={el.color}
		onchange={(c) => set<IconElement>((i) => (i.color = c), 'color')}
	/>
{/if}
