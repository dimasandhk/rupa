<script lang="ts" module>
	// Rendered previews, shared across components for the lifetime of the tab.
	const previews = new Map<string, Promise<string>>();

	function preview(id: string): Promise<string> {
		let p = previews.get(id);
		if (!p) {
			p = (async () => {
				const res = await fetch(`/api/designs/${id}`);
				if (!res.ok) throw new Error('not found');
				const { data } = await res.json();
				const { renderPage } = await import('../../canvas/export');
				const canvas = await renderPage(data, 0, {
					pixelRatio: 360 / Math.max(data.width, data.height)
				});
				return canvas.toDataURL('image/jpeg', 0.85);
			})();
			p.catch(() => previews.delete(id));
			previews.set(id, p);
		}
		return p;
	}
</script>

<script lang="ts">
	/**
	 * A design's stored thumbnail, or — for designs without one (e.g. seeded
	 * templates) — page 1 rendered in the browser.
	 */
	let {
		id,
		src,
		width,
		height,
		alt = '',
		class: className = ''
	}: {
		id: string;
		src: string | null;
		width: number;
		height: number;
		alt?: string;
		class?: string;
	} = $props();
</script>

{#if src}
	<img {src} {alt} class={className} loading="lazy" />
{:else}
	{#await preview(id)}
		<div
			class="animate-pulse bg-white/70 {className}"
			style:aspect-ratio="{width}/{height}"
			style:width="100%"
		></div>
	{:then url}
		<img src={url} {alt} class={className} />
	{:catch}
		<div
			class="bg-white {className}"
			style:aspect-ratio="{width}/{height}"
			style:width="100%"
		></div>
	{/await}
{/if}
