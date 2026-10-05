<script lang="ts">
	let {
		label,
		value,
		min,
		max,
		step = 1,
		oninput,
		onchange
	}: {
		label: string;
		value: number;
		min: number;
		max: number;
		step?: number;
		/** Fires continuously while dragging. */
		oninput: (v: number) => void;
		/** Fires once the user lets go (seal the history entry here). */
		onchange?: () => void;
	} = $props();

	const clamp = (v: number) => Math.min(max, Math.max(min, v));
	const display = $derived(Math.round(value / step) * step);
</script>

<div class="flex items-center gap-3 py-1">
	<span class="w-24 shrink-0 text-xs font-medium text-muted">{label}</span>
	<input
		type="range"
		class="h-1.5 min-w-0 flex-1 accent-brand"
		{min}
		{max}
		{step}
		{value}
		oninput={(e) => oninput(Number(e.currentTarget.value))}
		onchange={() => onchange?.()}
	/>
	<input
		type="number"
		class="input h-7 w-16 px-1.5 text-center text-xs"
		{min}
		{max}
		{step}
		value={Number(display.toFixed(2))}
		onchange={(e) => {
			oninput(clamp(Number(e.currentTarget.value) || 0));
			onchange?.();
		}}
	/>
</div>
