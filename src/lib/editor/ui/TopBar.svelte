<script lang="ts">
	import { Cloud, CloudAlert, CloudUpload, House, Play, Redo2, Undo2 } from '@lucide/svelte';
	import { getEditor } from '../context';
	import type { Autosave } from '../state/autosave.svelte';
	import DownloadDialog from './dialogs/DownloadDialog.svelte';
	import ResizeDialog from './dialogs/ResizeDialog.svelte';

	let { autosave, onerror }: { autosave: Autosave; onerror: (m: string) => void } = $props();
	const editor = getEditor();

	const STATUS = {
		saved: { label: 'All changes saved', icon: Cloud },
		saving: { label: 'Saving…', icon: CloudUpload },
		unsaved: { label: 'Unsaved changes', icon: CloudUpload },
		error: { label: 'Saving failed — retrying', icon: CloudAlert },
		conflict: { label: 'Edited elsewhere — reload', icon: CloudAlert }
	};
	const status = $derived(STATUS[autosave.status]);
	const StatusIcon = $derived(status.icon);
</script>

<header
	class="flex h-14 shrink-0 items-center gap-1 bg-gradient-to-r from-[#00c4cc] via-[#6a5cff] to-[#8b3dff] px-3 text-white"
>
	<a href="/" class="btn text-white hover:bg-white/15" title="Home"><House class="size-4" /> Home</a
	>
	<ResizeDialog {onerror} beforecopy={() => autosave.flush()} />
	<div class="mx-1 h-6 w-px bg-white/30"></div>
	<button
		class="icon-btn text-white hover:bg-white/15"
		title="Undo (Ctrl+Z)"
		disabled={!editor.canUndo}
		onclick={() => editor.undo()}><Undo2 class="size-4" /></button
	>
	<button
		class="icon-btn text-white hover:bg-white/15"
		title="Redo (Ctrl+Shift+Z)"
		disabled={!editor.canRedo}
		onclick={() => editor.redo()}><Redo2 class="size-4" /></button
	>
	<button
		class="icon-btn text-white hover:bg-white/15"
		class:text-yellow-200={autosave.status === 'error' || autosave.status === 'conflict'}
		title={autosave.error ?? status.label}
		aria-label={status.label}
		onclick={() => (autosave.status === 'conflict' ? location.reload() : autosave.flush())}
	>
		<StatusIcon class="size-4" />
	</button>

	<input
		class="ml-auto h-9 w-64 truncate rounded-lg bg-transparent px-2 text-right text-sm font-medium text-white outline-none placeholder:text-white/70 hover:bg-white/15 focus:bg-white focus:text-left focus:text-ink"
		bind:value={editor.title}
		placeholder="Untitled design"
		aria-label="Design title"
		maxlength="200"
		onkeydown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
	/>
	<a href="/design/{editor.id}/present" class="btn text-white hover:bg-white/15" title="Present">
		<Play class="size-4" /> Present
	</a>
	<DownloadDialog {onerror} />
</header>
