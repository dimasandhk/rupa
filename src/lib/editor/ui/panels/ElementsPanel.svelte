<script lang="ts">
	import { POLYGONS, PATHS, SHAPE_LABELS } from '../../canvas/shapes';
	import { getEditor } from '../../context';
	import { addLine, addShape } from '../../insert';
	import type { ShapeKind } from '../../model/types';
	import FramesSection from './FramesSection.svelte';
	import IconLibrary from './IconLibrary.svelte';

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
		<div class="panel-title">Frames</div>
		<FramesSection />
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
		<IconLibrary />
	</section>
</div>
