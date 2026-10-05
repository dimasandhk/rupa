<script lang="ts">
	import { Cloud, CloudAlert, CloudUpload, Play, Redo2, Undo2 } from '#lib/icons.ts';
	import Wordmark from '#lib/ui/Wordmark.svelte';
	import { getEditor } from '../context';
	import type { Autosave } from '../state/autosave.svelte';
	import DownloadDialog from './dialogs/DownloadDialog.svelte';
	import ResizeDialog from './dialogs/ResizeDialog.svelte';

	let { autosave, onerror }: { autosave: Autosave; onerror: (m: string) => void } = $props();
	const editor = getEditor();

	const STATUS = {
		saved: { label: 'All changes saved', short: 'Saved', icon: Cloud },
		saving: { label: 'Saving…', short: 'Saving', icon: CloudUpload },
		unsaved: { label: 'Unsaved changes', short: 'Editing', icon: CloudUpload },
		error: { label: 'Saving failed', short: 'Not saved', icon: CloudAlert },
		conflict: { label: 'Edited somewhere else', short: 'Conflict', icon: CloudAlert }
	};
	const status = $derived(STATUS[autosave.status]);
	const StatusIcon = $derived(status.icon);
	const problem = $derived(autosave.status === 'error' || autosave.status === 'conflict');
</script>

<header class="flex h-14 shrink-0 items-center gap-2 px-3">
	<Wordmark size="sm" />
	<span class="text-line select-none" aria-hidden="true">/</span>
	<input
		class="field-sizing-content h-8 max-w-72 min-w-24 truncate rounded-lg bg-transparent px-2 text-sm font-medium transition outline-none placeholder:text-muted hover:bg-ink/[0.05] focus:bg-white focus:ring-2 focus:ring-brand/30"
		bind:value={editor.title}
		placeholder="Untitled design"
		aria-label="Design title"
		maxlength="200"
		onkeydown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
	/>
	<button
		class="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs transition hover:bg-ink/[0.05] {problem
			? 'text-brand'
			: 'text-muted'}"
		title={autosave.error ?? status.label}
		aria-label={status.label}
		onclick={() => (autosave.status === 'conflict' ? location.reload() : autosave.flush())}
	>
		<StatusIcon class="size-3.5" />
		{status.short}
	</button>

	<div class="mx-auto flex items-center gap-0.5">
		<button
			class="icon-btn"
			title="Undo (Ctrl+Z)"
			disabled={!editor.canUndo}
			onclick={() => editor.undo()}
		>
			<Undo2 class="size-[18px]" />
		</button>
		<button
			class="icon-btn"
			title="Redo (Ctrl+Shift+Z)"
			disabled={!editor.canRedo}
			onclick={() => editor.redo()}
		>
			<Redo2 class="size-[18px]" />
		</button>
	</div>

	<ResizeDialog {onerror} beforecopy={() => autosave.flush()} />
	<a href="/design/{editor.id}/present" class="btn-ghost" title="Present">
		<Play class="size-4" /> Present
	</a>
	<DownloadDialog {onerror} />
</header>
