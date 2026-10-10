<script lang="ts">
	import { TRANSITION_TYPES, type PageTransition, type TransitionType } from '../model/types';
	import {
		DEFAULT_TRANSITION,
		DIRECTIONAL,
		playTransition,
		TRANSITION_LABELS
	} from '../canvas/transitions';
	import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from '#lib/icons.ts';

	let {
		value,
		onchange,
		onapplyall
	}: {
		value: PageTransition | undefined;
		onchange: (t: PageTransition | null) => void;
		onapplyall: (t: PageTransition | null) => void;
	} = $props();

	const current = $derived(value?.type ?? 'none');
	const directions = [
		{ id: 'left', label: 'Left', icon: ArrowLeft },
		{ id: 'right', label: 'Right', icon: ArrowRight },
		{ id: 'up', label: 'Up', icon: ArrowUp },
		{ id: 'down', label: 'Down', icon: ArrowDown }
	] as const;

	function pick(type: TransitionType) {
		onchange(type === 'none' ? null : { ...DEFAULT_TRANSITION, ...value, type });
	}
	const patch = (p: Partial<PageTransition>) => value && onchange({ ...value, ...p });

	/** Hovering a tile plays a miniature of the transition. */
	function preview(e: PointerEvent, type: TransitionType) {
		if (type === 'none') return;
		const tile = e.currentTarget as HTMLElement;
		const [outgoing, incoming, veil] = ['from', 'to', 'veil'].map((k) =>
			tile.querySelector<HTMLElement>(`[data-p="${k}"]`)!
		);
		playTransition(
			{ ...DEFAULT_TRANSITION, ...value, type, duration: 0.7 },
			{ incoming, outgoing, veil }
		);
	}
</script>

<div class="grid grid-cols-3 gap-2 p-3">
	{#each TRANSITION_TYPES as type (type)}
		{@const on = current === type}
		<button
			class="flex flex-col items-center gap-1.5 rounded-xl p-1.5 text-xs transition hover:bg-gray-100 {on
				? 'bg-brand-50 text-brand-600'
				: 'text-ink/80'}"
			aria-pressed={on}
			onpointerenter={(e) => preview(e, type)}
			onclick={() => pick(type)}
		>
			<span
				class="relative block aspect-video w-full overflow-hidden rounded-lg {on
					? 'ring-2 ring-brand'
					: 'ring-1 ring-line'}"
			>
				<span data-p="from" class="absolute inset-0 bg-sky-200"></span>
				<span data-p="to" class="absolute inset-0 bg-brand/70"></span>
				<span data-p="veil" class="absolute inset-0 bg-ink opacity-0"></span>
			</span>
			{TRANSITION_LABELS[type]}
		</button>
	{/each}
</div>

{#if value}
	<div class="space-y-3 border-t border-line px-3 py-3 text-sm">
		<label class="block">
			<span class="mb-1 flex justify-between text-xs text-muted">
				Duration <span class="tabular-nums">{value.duration.toFixed(1)}s</span>
			</span>
			<input
				type="range"
				class="w-full accent-brand"
				min="0.1"
				max="3"
				step="0.1"
				value={value.duration}
				oninput={(e) => patch({ duration: +e.currentTarget.value })}
			/>
		</label>

		{#if DIRECTIONAL.has(value.type)}
			<div>
				<span class="mb-1 block text-xs text-muted">Direction</span>
				<div class="flex gap-1">
					{#each directions as d (d.id)}
						<button
							class="grid h-8 flex-1 place-items-center rounded-lg ring-1 transition {value.direction ===
							d.id
								? 'bg-brand-50 text-brand-600 ring-brand'
								: 'ring-line hover:bg-gray-100'}"
							aria-label={d.label}
							title={d.label}
							aria-pressed={value.direction === d.id}
							onclick={() => patch({ direction: d.id })}
						>
							<d.icon class="size-4" />
						</button>
					{/each}
				</div>
			</div>
		{/if}
	</div>
{/if}

<div class="border-t border-line p-2">
	<button class="btn-ghost w-full justify-center" onclick={() => onapplyall(value ?? null)}>
		Apply to all slides
	</button>
</div>
