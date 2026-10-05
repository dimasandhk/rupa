<script lang="ts">
	import { dev } from '$app/env';
	import { removeBackground } from '#lib/ai/bg-removal.ts';
	import { X } from '#lib/icons.ts';
	import { fly } from 'svelte/transition';
	import { loadImage } from '../canvas/images';
	import { setEditor } from '../context';
	import type { ImageElement } from '../model/types';
	import { handleKeydown, handleKeyup, handlePaste, type ShortcutHooks } from '../shortcuts';
	import { Autosave } from '../state/autosave.svelte';
	import type { Editor } from '../state/editor.svelte';
	import ContextMenu from './ContextMenu.svelte';
	import Footer from './Footer.svelte';
	import LeftRail from './LeftRail.svelte';
	import PageGrid from './PageGrid.svelte';
	import ContextToolbar from './toolbar/ContextToolbar.svelte';
	import TopBar from './TopBar.svelte';
	import Workspace from './Workspace.svelte';

	let { editor }: { editor: Editor } = $props();

	// The editor instance never changes for this shell.
	// svelte-ignore state_referenced_locally
	setEditor(editor);
	// svelte-ignore state_referenced_locally
	const autosave = new Autosave(editor);
	// Handy for debugging and e2e tests.
	// svelte-ignore state_referenced_locally
	if (dev) Object.assign(window, { __editor: editor });

	let workspace: Workspace;
	let menuPos = $state<{ x: number; y: number } | null>(null);
	let gridOpen = $state(false);
	let toast = $state<{ message: string; tone: 'info' | 'error' } | null>(null);
	let toastTimer: ReturnType<typeof setTimeout>;
	let removingId = $state<string | null>(null);

	function notify(message: string, tone: 'info' | 'error' = 'error', ms = 5000) {
		toast = { message, tone };
		clearTimeout(toastTimer);
		if (ms) toastTimer = setTimeout(() => (toast = null), ms);
	}

	const hooks: ShortcutHooks = {
		zoomBy: (f) => workspace.zoomBy(f),
		zoomToFit: () => workspace.zoomToFit(),
		onError: (m) => notify(m)
	};

	async function toggleBackground(el: ImageElement) {
		if (el.originalSrc) {
			const original = el.originalSrc;
			editor.updateElements([el.id], (e) => {
				if (e.type !== 'image') return;
				e.src = original;
				delete e.originalSrc;
			});
			return;
		}
		removingId = el.id;
		try {
			const url = await removeBackground(el.src, (m) => notify(m, 'info', 0));
			await loadImage(url); // swap only once decoded, so the photo never flashes blank
			editor.updateElements([el.id], (e) => {
				if (e.type !== 'image') return;
				e.originalSrc = e.src;
				e.src = url;
			});
			notify('Background removed', 'info', 2500);
		} catch (err) {
			notify(`Background removal failed: ${(err as Error).message}`);
		} finally {
			removingId = null;
		}
	}
</script>

<svelte:window
	onkeydown={(e) => handleKeydown(e, editor, hooks)}
	onkeyup={(e) => handleKeyup(e, editor)}
	onpaste={(e) => handlePaste(e, editor, hooks)}
/>

<div class="flex h-dvh flex-col overflow-hidden">
	<TopBar {autosave} onerror={notify} />
	<div class="flex min-h-0 flex-1 gap-2 pr-2 pb-2 pl-1">
		<LeftRail onerror={notify} />
		<main
			class="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl canvas-dots ring-1 ring-line"
		>
			<ContextToolbar onremovebg={toggleBackground} {removingId} />
			<Workspace bind:this={workspace} oncontextmenu={(p) => (menuPos = p)} onerror={notify} />
			<Footer
				onzoom={(z) => workspace.setZoom(z)}
				onfit={() => workspace.zoomToFit()}
				ongrid={() => (gridOpen = true)}
			/>
		</main>
	</div>
</div>

<ContextMenu bind:pos={menuPos} />

{#if gridOpen}
	<PageGrid
		onclose={() => (gridOpen = false)}
		onopen={(i) => {
			gridOpen = false;
			editor.setActivePage(i);
			workspace.scrollToPage(i);
		}}
	/>
{/if}

{#if autosave.status === 'conflict'}
	<div
		class="fixed top-16 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl border-l-4 border-brand bg-white py-2.5 pr-2.5 pl-4 text-sm shadow-float ring-1 ring-line"
		role="alert"
		transition:fly={{ y: -8, duration: 200 }}
	>
		This design changed in another tab or window.
		<button class="btn-outline h-8" onclick={() => location.reload()}>Load latest</button>
		<button class="btn-primary h-8" onclick={() => autosave.overwrite()}>Keep my version</button>
	</div>
{/if}

{#if toast}
	<div
		class="fixed bottom-20 left-1/2 z-50 flex max-w-lg -translate-x-1/2 items-center gap-3 rounded-2xl bg-ink py-2.5 pr-2.5 pl-4 text-sm text-paper shadow-float"
		role={toast.tone === 'error' ? 'alert' : 'status'}
		transition:fly={{ y: 8, duration: 200 }}
	>
		{#if toast.tone === 'error'}<span
				class="size-2 shrink-0 rounded-full bg-brand"
				aria-hidden="true"
			></span>{/if}
		{toast.message}
		<button class="opacity-70 hover:opacity-100" aria-label="Dismiss" onclick={() => (toast = null)}
			><X class="size-4" /></button
		>
	</div>
{/if}
