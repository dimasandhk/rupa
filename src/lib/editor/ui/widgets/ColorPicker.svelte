<script lang="ts">
	import { getEditor } from '../../context';
	import type { Element } from '../../model/types';
	import Pop from './Pop.svelte';
	import type { Snippet } from 'svelte';

	let {
		value,
		title = 'Color',
		onchange,
		icon
	}: {
		value: string;
		title?: string;
		onchange: (color: string) => void;
		/** Custom trigger content (e.g. the "A" with a color bar for text). */
		icon?: Snippet;
	} = $props();

	const editor = getEditor();

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

	/** Colors already used in the design, most frequent first (Canva's "Document colors"). */
	const documentColors = $derived.by(() => {
		const counts = new Map<string, number>();
		const add = (c?: string) => {
			if (!c || c === 'transparent') return;
			const k = c.toLowerCase();
			counts.set(k, (counts.get(k) ?? 0) + 1);
		};
		const visit = (els: Element[]) => {
			for (const el of els) {
				if (el.type === 'text') add(el.fill);
				else if (el.type === 'shape') add(el.fill);
				else if (el.type === 'line') add(el.stroke);
				else if (el.type === 'icon') add(el.color);
				else if (el.type === 'group') visit(el.children);
			}
		};
		for (const p of editor.data.pages) {
			add(p.background.color);
			visit(p.elements);
		}
		return [...counts.entries()]
			.sort((a, b) => b[1] - a[1])
			.map(([c]) => c)
			.slice(0, 12);
	});

	function commitHex(v: string) {
		const m = v.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
		if (m) onchange(`#${m[1].toLowerCase()}`);
	}
</script>

{#snippet swatch(c: string)}
	<button
		class="size-7 rounded-full border border-black/10 transition hover:scale-110"
		class:ring-2={c.toLowerCase() === value?.toLowerCase()}
		class:ring-brand={c.toLowerCase() === value?.toLowerCase()}
		class:ring-offset-1={c.toLowerCase() === value?.toLowerCase()}
		style:background={c}
		title={c}
		aria-label={c}
		onclick={() => {
			onchange(c);
			editor.sealHistory();
		}}
	></button>
{/snippet}

<Pop {title} triggerClass="icon-btn" width={264}>
	{#snippet trigger()}
		{#if icon}
			{@render icon()}
		{:else}
			<span class="size-6 rounded-full border border-black/15" style:background={value}></span>
		{/if}
	{/snippet}
	<div class="space-y-3">
		<div class="flex items-center gap-2">
			<label
				class="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-full border border-line"
				title="Custom color"
				style="background: conic-gradient(red, yellow, lime, aqua, blue, magenta, red)"
			>
				<input
					type="color"
					class="absolute inset-0 cursor-pointer opacity-0"
					value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'}
					oninput={(e) => onchange(e.currentTarget.value)}
					onchange={() => editor.sealHistory()}
				/>
			</label>
			<input
				class="input font-mono uppercase"
				{value}
				maxlength="7"
				onchange={(e) => commitHex(e.currentTarget.value)}
				aria-label="Hex color"
			/>
		</div>
		{#if documentColors.length}
			<div>
				<div class="mb-1.5 text-xs font-semibold text-muted">Document colors</div>
				<div class="grid grid-cols-7 gap-1.5">
					{#each documentColors as c (c)}{@render swatch(c)}{/each}
				</div>
			</div>
		{/if}
		<div>
			<div class="mb-1.5 text-xs font-semibold text-muted">Default colors</div>
			<div class="grid grid-cols-6 gap-1.5">
				{#each PALETTE as c (c)}{@render swatch(c)}{/each}
			</div>
		</div>
	</div>
</Pop>
