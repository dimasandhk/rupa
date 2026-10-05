<script lang="ts">
	import { Editor } from '#lib/editor/state/editor.svelte.ts';
	import EditorShell from '#lib/editor/ui/EditorShell.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>{data.title} · Rupa</title></svelte:head>

<!-- Re-create the editor when navigating between designs (e.g. after "Copy & resize"). -->
{#key data.id}
	<EditorShell
		editor={new Editor({ id: data.id, title: data.title, data: data.data, version: data.version })}
	/>
{/key}
