<script lang="ts">
	import mark from '#lib/assets/favicon.svg';

	let { size = 'md', href = '/' }: { size?: 'sm' | 'md' | 'lg'; href?: string | null } = $props();

	const SIZES = {
		sm: { mark: 'size-6', text: 'text-lg' },
		md: { mark: 'size-7', text: 'text-[22px]' },
		lg: { mark: 'size-9', text: 'text-3xl' }
	};
	const s = $derived(SIZES[size]);
</script>

<svelte:element
	this={href ? 'a' : 'span'}
	{href}
	class="group inline-flex items-center gap-2 rounded-lg"
	aria-label={href ? 'Rupa home' : undefined}
>
	<img
		src={mark}
		alt=""
		class="{s.mark} transition duration-300 ease-(--ease-spring) group-hover:-rotate-6"
	/>
	<span class="font-display leading-none font-semibold text-ink italic {s.text}">Rupa</span>
</svelte:element>
