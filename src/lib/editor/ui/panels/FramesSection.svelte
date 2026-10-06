<script lang="ts">
	import { ensureFont } from '../../canvas/fonts';
	import { getEditor } from '../../context';
	import { addFrame } from '../../insert';
	import { FRAME_CHARS, FRAME_GROUPS, FRAMES, LETTER_FONT } from '../../model/frames';
	import type { FrameKind } from '../../model/types';

	const editor = getEditor();
	const KINDS = (Object.keys(FRAMES) as FrameKind[]).filter((k) => k !== 'letter');

	$effect(() => {
		ensureFont(LETTER_FONT, 400);
	});

	let showAllChars = $state(false);
	const chars = $derived(showAllChars ? FRAME_CHARS : FRAME_CHARS.slice(0, 8));

	const hint = $derived(
		editor.selectedElements.length === 1 && editor.selectedElements[0].type === 'frame'
			? 'Click a photo in Uploads or Photos to fill the selected frame.'
			: 'Drop a photo onto a frame to fill it.'
	);
</script>

<!-- Placeholder art shared by every preview (same as on the canvas). -->
{#snippet scenery(x: number, y: number, w: number, h: number)}
	<svg {x} {y} width={w} height={h} viewBox="0 0 100 100" preserveAspectRatio="none">
		<rect width="100" height="100" fill="#ebe4d9" />
		<circle cx="70" cy="32" r="9" fill="#f1c2a8" />
		<path d="M0 70C18 58 38 58 58 66S88 76 100 64V100H0Z" fill="#d3c6b3" />
		<path d="M0 84C24 74 52 77 74 85S94 92 100 88V100H0Z" fill="#bcac94" />
	</svg>
{/snippet}

{#snippet preview(kind: FrameKind)}
	{@const def = FRAMES[kind]}
	{@const W = 100 * Math.min(1, def.aspect)}
	{@const H = 100 * Math.min(1, 1 / def.aspect)}
	{@const [sx, sy, sw, sh] = def.screen ?? [0, 0, 1, 1]}
	<svg
		viewBox="0 0 {W} {H}"
		class="max-h-full max-w-full"
		style:aspect-ratio="{W}/{H}"
		aria-hidden="true"
	>
		{#if kind === 'polaroid'}
			<rect width={W} height={H} rx="1.5" fill="#fdfcf9" stroke="#e7e0d6" />
		{:else if kind === 'film'}
			<rect width={W} height={H} rx="1.5" fill="#18140f" />
			{#each { length: 8 }, i (i)}
				<rect
					x={i * (W / 8) + W / 32}
					y={H * 0.05}
					width={W / 16}
					height={H * 0.07}
					rx="0.6"
					fill="#f6f2eb"
				/>
				<rect
					x={i * (W / 8) + W / 32}
					y={H * 0.88}
					width={W / 16}
					height={H * 0.07}
					rx="0.6"
					fill="#f6f2eb"
				/>
			{/each}
		{:else if kind === 'phone' || kind === 'tablet'}
			<rect width={W} height={H} rx={W * (kind === 'phone' ? 0.14 : 0.05)} fill="#2a2622" />
		{:else if kind === 'laptop'}
			<rect x={W * 0.12} width={W * 0.76} height={H * 0.84} rx={W * 0.02} fill="#2a2622" />
			<path d="M0 {H * 0.88}H{W}L{W * 0.96} {H}H{W * 0.04}Z" fill="#c9c1b5" />
		{:else if kind === 'browser'}
			<rect width={W} height={H} rx={W * 0.025} fill="#f3eee6" stroke="#e7e0d6" />
			{#each ['#e8857a', '#e9c46a', '#8fc093'] as c, i (c)}
				<circle cx={H * 0.055 + i * H * 0.05} cy={H * 0.05} r={H * 0.016} fill={c} />
			{/each}
		{/if}
		<clipPath id="frame-{kind}">
			{#if def.clip}
				<path
					d={def.clip}
					transform="translate({sx * W} {sy * H}) scale({(sw * W) / 100} {(sh * H) / 100})"
				/>
			{:else}
				<rect
					x={sx * W}
					y={sy * H}
					width={sw * W}
					height={sh * H}
					rx={(def.screenRadius ?? 0) * W}
				/>
			{/if}
		</clipPath>
		<g clip-path="url(#frame-{kind})">{@render scenery(sx * W, sy * H, sw * W, sh * H)}</g>
	</svg>
{/snippet}

{#each FRAME_GROUPS.filter((g) => g !== 'Letters & numbers') as group (group)}
	<div class="mb-1.5 text-xs font-medium text-muted">{group}</div>
	<div class="mb-3 grid grid-cols-4 gap-2">
		{#each KINDS.filter((k) => FRAMES[k].group === group) as kind (kind)}
			<button
				class="grid aspect-square place-items-center rounded-lg p-1.5 transition hover:bg-gray-100 active:scale-95"
				title="{FRAMES[kind].label} frame"
				aria-label="{FRAMES[kind].label} frame"
				onclick={() => addFrame(editor, kind)}
			>
				{@render preview(kind)}
			</button>
		{/each}
	</div>
{/each}

<div class="mb-1.5 flex items-baseline justify-between">
	<span class="text-xs font-medium text-muted">Letters & numbers</span>
	<button
		class="text-[11px] font-medium text-muted underline underline-offset-2 hover:text-ink"
		onclick={() => (showAllChars = !showAllChars)}
	>
		{showAllChars ? 'Show less' : 'See all'}
	</button>
</div>
<div class="grid grid-cols-8 gap-1">
	{#each chars as ch (ch)}
		<button
			class="grid aspect-square place-items-center rounded-md transition hover:bg-gray-100 active:scale-95"
			title="Letter frame {ch}"
			aria-label="Letter frame {ch}"
			onclick={() => addFrame(editor, 'letter', ch)}
		>
			<svg viewBox="0 0 82 100" class="h-full" aria-hidden="true">
				<clipPath id="char-{ch}">
					<text x="41" y="86" text-anchor="middle" font-size="104" font-family={LETTER_FONT}
						>{ch}</text
					>
				</clipPath>
				<g clip-path="url(#char-{ch})">{@render scenery(0, 0, 82, 100)}</g>
			</svg>
		</button>
	{/each}
</div>
<p class="mt-2 text-[11px] text-muted">{hint}</p>
