<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// Lets e2e tests (and anything else) know client-side handlers are attached.
	$effect(() => {
		document.documentElement.dataset.hydrated = '';
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Rupa</title>
</svelte:head>

{@render children()}
