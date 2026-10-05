<script lang="ts">
	import { ensureFont } from '../../canvas/fonts';
	import { getEditor } from '../../context';
	import { addText, TEXT_PRESETS } from '../../insert';
	import { createText } from '../../model/factory';
	import type { TextElement } from '../../model/types';

	const editor = getEditor();

	/** Pre-paired heading + body styles, inserted as a group (like Canva's font combinations). */
	const COMBOS: { name: string; heading: Partial<TextElement>; body: Partial<TextElement> }[] = [
		{
			name: 'Modern',
			heading: { text: 'BIG IDEAS', fontFamily: 'Montserrat', fontWeight: 800, letterSpacing: 4 },
			body: { text: 'start with small steps', fontFamily: 'Montserrat', fontWeight: 400 }
		},
		{
			name: 'Elegant',
			heading: {
				text: 'Save the Date',
				fontFamily: 'Playfair Display',
				fontWeight: 700,
				italic: true
			},
			body: { text: 'JUNE 21 · GARDEN HALL', fontFamily: 'Lato', fontWeight: 400, letterSpacing: 3 }
		},
		{
			name: 'Bold',
			heading: { text: 'SALE', fontFamily: 'Anton', fontWeight: 400, fill: '#ff3131' },
			body: { text: 'Up to 50% off everything', fontFamily: 'Poppins', fontWeight: 500 }
		},
		{
			name: 'Handwritten',
			heading: { text: 'Hello friend', fontFamily: 'Pacifico', fontWeight: 400 },
			body: { text: 'thanks for stopping by', fontFamily: 'Quicksand', fontWeight: 500 }
		}
	];

	$effect(() => {
		for (const c of COMBOS) {
			ensureFont(c.heading.fontFamily!, c.heading.fontWeight, c.heading.italic);
			ensureFont(c.body.fontFamily!, c.body.fontWeight);
		}
	});

	function addCombo(c: (typeof COMBOS)[number]) {
		const s = Math.min(editor.data.width, editor.data.height) / 1080;
		const width = editor.data.width * 0.7;
		const hSize = 110 * s;
		const bSize = 36 * s;
		const heading = createText({
			...c.heading,
			width,
			fontSize: hSize,
			height: hSize * 1.2,
			lineHeight: 1.2,
			y: 0
		});
		const body = createText({
			...c.body,
			width,
			fontSize: bSize,
			height: bSize * 1.4,
			y: hSize * 1.3
		});
		editor.addElements([heading, body], { center: false });
		// Center the pair, then group it so it moves as one.
		const top = (editor.data.height - (hSize * 1.3 + bSize * 1.4)) / 2;
		const left = (editor.data.width - width) / 2;
		editor.updateElements([heading.id, body.id], (e) => {
			e.x += left;
			e.y += top;
		});
		editor.select([heading.id, body.id]);
		editor.groupSelected();
	}
</script>

<div class="space-y-5">
	<button class="btn-primary w-full" onclick={() => addText(editor)}>Add a text box</button>
	<section>
		<div class="panel-title">Default text styles</div>
		<div class="space-y-2">
			{#each TEXT_PRESETS as p, i (p.label)}
				<button
					class="w-full rounded-lg border border-line px-3 py-2 text-left hover:bg-gray-50"
					style:font-size="{[26, 18, 13][i]}px"
					style:font-weight={p.props.fontWeight ?? 400}
					onclick={() => addText(editor, p.props)}
				>
					{p.label}
				</button>
			{/each}
		</div>
	</section>
	<section>
		<div class="panel-title">Font combinations</div>
		<div class="grid grid-cols-2 gap-2">
			{#each COMBOS as c (c.name)}
				<button
					class="flex aspect-[4/3] flex-col items-center justify-center rounded-lg bg-canvas p-2 hover:ring-2 hover:ring-brand"
					onclick={() => addCombo(c)}
				>
					<span
						class="text-lg leading-tight"
						style:font-family={`"${c.heading.fontFamily}"`}
						style:font-weight={c.heading.fontWeight}
						style:font-style={c.heading.italic ? 'italic' : 'normal'}
						style:color={c.heading.fill}>{c.heading.text}</span
					>
					<span class="text-[10px]" style:font-family={`"${c.body.fontFamily}"`}>{c.body.text}</span
					>
				</button>
			{/each}
		</div>
	</section>
</div>
