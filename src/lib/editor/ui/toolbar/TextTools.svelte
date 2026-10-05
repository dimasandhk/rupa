<script lang="ts" module>
	function previewStyle(name: string) {
		switch (name) {
			case 'Shadow':
				return 'text-shadow: 2px 2px 3px rgba(0,0,0,.4)';
			case 'Lift':
				return 'text-shadow: 0 3px 8px rgba(0,0,0,.35)';
			case 'Hollow':
				return 'color: transparent; -webkit-text-stroke: 1px #000';
			case 'Outline':
				return '-webkit-text-stroke: 1px #000; color: #fff';
			case 'Neon':
				return 'color: #fff; text-shadow: 0 0 6px #ff66c4, 0 0 2px #ff66c4';
			case 'Background':
				return 'background: #ffde59; padding: 0 4px; border-radius: 4px';
			default:
				return '';
		}
	}
</script>

<script lang="ts">
	import {
		AlignCenter,
		AlignJustify,
		AlignLeft,
		AlignRight,
		Bold,
		CaseUpper,
		Italic,
		Minus,
		Plus,
		Sparkles,
		Strikethrough,
		Underline,
		UnfoldVertical
	} from '#lib/icons.ts';
	import { fillToCss, primaryColor } from '../../color/color';
	import { ensureFont } from '../../canvas/fonts';
	import { getEditor } from '../../context';
	import type { TextEffects, TextElement } from '../../model/types';
	import ColorPicker from '../widgets/ColorPicker.svelte';
	import Pop from '../widgets/Pop.svelte';
	import RangeField from '../widgets/RangeField.svelte';
	import FontPicker from './FontPicker.svelte';

	let { els }: { els: TextElement[] } = $props();
	const editor = getEditor();
	const el = $derived(els[0]);
	const ids = $derived(els.map((e) => e.id).join());

	function set(recipe: (t: TextElement) => void, key?: string) {
		editor.updateSelected(
			(e) => e.type === 'text' && recipe(e),
			key ? { key: `${key}:${ids}` } : undefined
		);
	}

	const SIZES = [
		6, 8, 10, 12, 14, 16, 18, 21, 24, 28, 32, 36, 42, 48, 56, 64, 72, 80, 88, 96, 104, 120, 144
	];
	function stepSize(dir: 1 | -1) {
		const cur = Math.round(el.fontSize);
		const next =
			dir > 0
				? (SIZES.find((s) => s > cur) ?? cur + 24)
				: ([...SIZES].reverse().find((s) => s < cur) ?? Math.max(1, cur - 1));
		set((t) => (t.fontSize = next), 'fontSize');
	}

	const ALIGN = { left: AlignLeft, center: AlignCenter, right: AlignRight, justify: AlignJustify };
	const NEXT_ALIGN = {
		left: 'center',
		center: 'right',
		right: 'justify',
		justify: 'left'
	} as const;
	const AlignIcon = $derived(ALIGN[el.align]);

	function setFont(family: string) {
		set((t) => (t.fontFamily = family));
		ensureFont(family, el.fontWeight, el.italic);
	}

	function toggleBold() {
		const weight = el.fontWeight >= 600 ? 400 : 700;
		ensureFont(el.fontFamily, weight, el.italic);
		set((t) => (t.fontWeight = weight));
	}

	// ---- effects
	type Preset = {
		name: string;
		effects: (t: TextElement) => TextEffects;
		fill?: (t: TextElement) => string;
	};
	const PRESETS: Preset[] = [
		{ name: 'None', effects: () => ({}) },
		{
			name: 'Shadow',
			effects: (t) => ({
				shadow: {
					color: '#000000',
					blur: t.fontSize * 0.15,
					offsetX: t.fontSize * 0.06,
					offsetY: t.fontSize * 0.06,
					opacity: 0.4
				}
			})
		},
		{
			name: 'Lift',
			effects: (t) => ({
				shadow: {
					color: '#000000',
					blur: t.fontSize * 0.5,
					offsetX: 0,
					offsetY: t.fontSize * 0.08,
					opacity: 0.35
				}
			})
		},
		{
			name: 'Hollow',
			effects: (t) => ({
				outline: {
					color: t.fill === 'transparent' ? '#000000' : primaryColor(t.fill),
					width: Math.max(1, t.fontSize * 0.03)
				}
			}),
			fill: () => 'transparent'
		},
		{
			name: 'Outline',
			effects: (t) => ({ outline: { color: '#000000', width: Math.max(1, t.fontSize * 0.06) } })
		},
		{
			name: 'Neon',
			effects: (t) => ({
				shadow: {
					color: t.fill === '#000000' ? '#ff66c4' : primaryColor(t.fill),
					blur: t.fontSize * 0.35,
					offsetX: 0,
					offsetY: 0,
					opacity: 1
				}
			})
		},
		{
			name: 'Background',
			effects: (t) => ({
				background: {
					color: '#ffde59',
					padding: t.fontSize * 0.25,
					cornerRadius: t.fontSize * 0.15
				}
			})
		}
	];

	const activePreset = $derived.by(() => {
		const fx = el.effects;
		if (fx.background) return 'Background';
		if (fx.outline) return el.fill === 'transparent' ? 'Hollow' : 'Outline';
		if (fx.shadow)
			return fx.shadow.offsetX === 0 && fx.shadow.offsetY === 0
				? 'Neon'
				: fx.shadow.blur > el.fontSize * 0.3
					? 'Lift'
					: 'Shadow';
		return 'None';
	});

	function applyPreset(p: Preset) {
		set((t) => {
			if (t.fill === 'transparent' && p.name !== 'Hollow')
				t.fill = t.effects.outline?.color ?? '#000000';
			t.effects = p.effects(t);
			if (p.fill) t.fill = p.fill(t);
		});
	}
</script>

<FontPicker value={el.fontFamily} onchange={setFont} />

<div class="flex items-center rounded-lg border border-line">
	<button class="icon-btn size-8" title="Decrease font size" onclick={() => stepSize(-1)}
		><Minus class="size-4" /></button
	>
	<input
		class="h-8 w-12 border-x border-line text-center text-sm outline-none"
		value={Math.round(el.fontSize * 10) / 10}
		aria-label="Font size"
		onchange={(e) => {
			const v = Number(e.currentTarget.value);
			if (v > 0 && v < 2000) set((t) => (t.fontSize = v));
		}}
	/>
	<button class="icon-btn size-8" title="Increase font size" onclick={() => stepSize(1)}
		><Plus class="size-4" /></button
	>
</div>

<ColorPicker
	title="Text color"
	value={el.fill === 'transparent' ? (el.effects.outline?.color ?? '#000000') : el.fill}
	onfill={(f) => set((t) => (t.fill = f), 'fill')}
>
	{#snippet icon()}
		<span class="flex flex-col items-center leading-none">
			<span class="text-base font-bold">A</span>
			<span
				class="mt-0.5 h-1 w-5 rounded-sm border border-black/10"
				style:background={fillToCss(el.fill)}
			></span>
		</span>
	{/snippet}
</ColorPicker>

<button class="icon-btn" title="Bold" aria-pressed={el.fontWeight >= 600} onclick={toggleBold}
	><Bold class="size-4" /></button
>
<button
	class="icon-btn"
	title="Italic"
	aria-pressed={el.italic}
	onclick={() => {
		ensureFont(el.fontFamily, el.fontWeight, !el.italic);
		set((t) => (t.italic = !t.italic));
	}}><Italic class="size-4" /></button
>
<button
	class="icon-btn"
	title="Underline"
	aria-pressed={el.underline}
	onclick={() => set((t) => (t.underline = !t.underline))}><Underline class="size-4" /></button
>
<button
	class="icon-btn"
	title="Strikethrough"
	aria-pressed={el.strike}
	onclick={() => set((t) => (t.strike = !t.strike))}><Strikethrough class="size-4" /></button
>
<button
	class="icon-btn"
	title="Uppercase"
	aria-pressed={el.uppercase}
	onclick={() => set((t) => (t.uppercase = !t.uppercase))}><CaseUpper class="size-4" /></button
>
<button
	class="icon-btn"
	title="Alignment: {el.align}"
	onclick={() => set((t) => (t.align = NEXT_ALIGN[t.align]))}
>
	<AlignIcon class="size-4" />
</button>

<Pop title="Spacing" triggerClass="icon-btn" width={300}>
	{#snippet trigger()}<UnfoldVertical class="size-4" />{/snippet}
	<RangeField
		label="Letter spacing"
		value={el.letterSpacing}
		min={-20}
		max={100}
		oninput={(v) => set((t) => (t.letterSpacing = v), 'letterSpacing')}
		onchange={() => editor.sealHistory()}
	/>
	<RangeField
		label="Line spacing"
		value={el.lineHeight}
		min={0.5}
		max={2.5}
		step={0.05}
		oninput={(v) => set((t) => (t.lineHeight = v), 'lineHeight')}
		onchange={() => editor.sealHistory()}
	/>
</Pop>

<Pop title="Effects" triggerClass="btn-ghost" width={320}>
	{#snippet trigger()}<Sparkles class="size-4" /> Effects{/snippet}
	<div class="panel-title">Style</div>
	<div class="grid grid-cols-4 gap-2">
		{#each PRESETS as p (p.name)}
			<button
				class="flex flex-col items-center gap-1 rounded-lg border p-2 text-[11px] hover:border-brand"
				class:border-brand={activePreset === p.name}
				class:border-line={activePreset !== p.name}
				onclick={() => applyPreset(p)}
			>
				<span class="text-xl font-black" style={previewStyle(p.name)}>Ag</span>
				{p.name}
			</button>
		{/each}
	</div>

	{#if el.effects.shadow}
		{@const s = el.effects.shadow}
		<div class="mt-3 border-t border-line pt-3">
			<RangeField
				label="Blur"
				value={s.blur}
				min={0}
				max={Math.max(100, el.fontSize)}
				oninput={(v) => set((t) => t.effects.shadow && (t.effects.shadow.blur = v), 'sblur')}
				onchange={() => editor.sealHistory()}
			/>
			<RangeField
				label="Offset X"
				value={s.offsetX}
				min={-100}
				max={100}
				oninput={(v) => set((t) => t.effects.shadow && (t.effects.shadow.offsetX = v), 'sx')}
				onchange={() => editor.sealHistory()}
			/>
			<RangeField
				label="Offset Y"
				value={s.offsetY}
				min={-100}
				max={100}
				oninput={(v) => set((t) => t.effects.shadow && (t.effects.shadow.offsetY = v), 'sy')}
				onchange={() => editor.sealHistory()}
			/>
			<RangeField
				label="Transparency"
				value={Math.round(s.opacity * 100)}
				min={0}
				max={100}
				oninput={(v) => set((t) => t.effects.shadow && (t.effects.shadow.opacity = v / 100), 'sop')}
				onchange={() => editor.sealHistory()}
			/>
			<div class="flex items-center gap-3 py-1">
				<span class="w-24 text-xs font-medium text-muted">Color</span>
				<ColorPicker
					title="Shadow color"
					value={s.color}
					onchange={(c) => set((t) => t.effects.shadow && (t.effects.shadow.color = c), 'scolor')}
				/>
			</div>
		</div>
	{/if}
	{#if el.effects.outline}
		{@const o = el.effects.outline}
		<div class="mt-3 border-t border-line pt-3">
			<RangeField
				label="Thickness"
				value={o.width}
				min={0.5}
				max={Math.max(20, el.fontSize * 0.2)}
				step={0.5}
				oninput={(v) => set((t) => t.effects.outline && (t.effects.outline.width = v), 'owidth')}
				onchange={() => editor.sealHistory()}
			/>
			<div class="flex items-center gap-3 py-1">
				<span class="w-24 text-xs font-medium text-muted">Color</span>
				<ColorPicker
					title="Outline color"
					value={o.color}
					onchange={(c) => set((t) => t.effects.outline && (t.effects.outline.color = c), 'ocolor')}
				/>
			</div>
		</div>
	{/if}
	{#if el.effects.background}
		{@const b = el.effects.background}
		<div class="mt-3 border-t border-line pt-3">
			<RangeField
				label="Roundness"
				value={b.cornerRadius}
				min={0}
				max={Math.max(50, el.fontSize)}
				oninput={(v) =>
					set((t) => t.effects.background && (t.effects.background.cornerRadius = v), 'bround')}
				onchange={() => editor.sealHistory()}
			/>
			<RangeField
				label="Spread"
				value={b.padding}
				min={0}
				max={Math.max(50, el.fontSize)}
				oninput={(v) =>
					set((t) => t.effects.background && (t.effects.background.padding = v), 'bpad')}
				onchange={() => editor.sealHistory()}
			/>
			<div class="flex items-center gap-3 py-1">
				<span class="w-24 text-xs font-medium text-muted">Color</span>
				<ColorPicker
					title="Background color"
					value={b.color}
					onchange={(c) =>
						set((t) => t.effects.background && (t.effects.background.color = c), 'bcolor')}
				/>
			</div>
		</div>
	{/if}
</Pop>
