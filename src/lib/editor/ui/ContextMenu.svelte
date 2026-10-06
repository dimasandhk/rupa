<script lang="ts">
	import { getEditor } from '../context';

	let { pos = $bindable(null) }: { pos: { x: number; y: number } | null } = $props();
	const editor = getEditor();

	const els = $derived(editor.selectedElements);
	const single = $derived(els.length === 1 ? els[0] : undefined);

	type Item = { label: string; hint?: string; run: () => void; danger?: boolean } | 'sep';

	const items = $derived.by((): Item[] => {
		if (!els.length) {
			return [
				{ label: 'Paste', hint: 'Ctrl+V', run: () => editor.pasteElements() },
				{ label: 'Select all', hint: 'Ctrl+A', run: () => editor.selectAll() },
				'sep',
				{ label: 'Add page', run: () => editor.addPage() },
				{ label: 'Duplicate page', run: () => editor.duplicatePage() }
			];
		}
		const list: Item[] = [
			{ label: 'Copy', hint: 'Ctrl+C', run: () => editor.copy() },
			{ label: 'Paste', hint: 'Ctrl+V', run: () => editor.pasteElements() },
			{ label: 'Duplicate', hint: 'Ctrl+D', run: () => editor.duplicateSelected() },
			{ label: 'Delete', hint: 'Del', run: () => editor.deleteSelected(), danger: true },
			'sep',
			{ label: 'Bring forward', hint: 'Ctrl+]', run: () => editor.reorder('forward') },
			{ label: 'Bring to front', hint: 'Ctrl+Shift+]', run: () => editor.reorder('front') },
			{ label: 'Send backward', hint: 'Ctrl+[', run: () => editor.reorder('backward') },
			{ label: 'Send to back', hint: 'Ctrl+Shift+[', run: () => editor.reorder('back') },
			'sep'
		];
		if (els.length > 1)
			list.push({ label: 'Group', hint: 'Ctrl+G', run: () => editor.groupSelected() });
		if (single?.type === 'group')
			list.push({ label: 'Ungroup', hint: 'Ctrl+Shift+G', run: () => editor.ungroupSelected() });
		list.push({
			label: els.some((e) => !e.locked) ? 'Lock' : 'Unlock',
			run: () => editor.toggleLock()
		});
		if (single?.type === 'frame' && single.image) {
			const id = single.id;
			list.push(
				{ label: 'Adjust photo', run: () => editor.startCrop(id) },
				{ label: 'Detach image', run: () => editor.detachFrameImage(id) }
			);
		}
		if (single?.type === 'image') {
			const el = single;
			list.push({
				label: 'Set image as background',
				run: () =>
					editor.updatePage((p) => {
						p.background.image = { src: el.src, assetId: el.assetId };
						p.elements = p.elements.filter((e) => e.id !== el.id);
					})
			});
		}
		list.push({
			label: 'Align to page center',
			run: () => (editor.align('center'), editor.align('middle'))
		});
		return list;
	});

	let menu = $state<HTMLDivElement>();
	// Keep the menu inside the viewport.
	const style = $derived.by(() => {
		if (!pos) return '';
		const w = 240;
		const h = items.length * 32;
		const x = Math.min(pos.x, window.innerWidth - w - 8);
		const y = Math.min(pos.y, window.innerHeight - h - 8);
		return `left:${x}px;top:${Math.max(8, y)}px;width:${w}px`;
	});

	$effect(() => {
		if (!pos) return;
		const close = (e: Event) => {
			if (e instanceof KeyboardEvent && e.key !== 'Escape') return;
			if (e.type === 'pointerdown' && menu?.contains(e.target as Node)) return;
			pos = null;
		};
		window.addEventListener('pointerdown', close, true);
		window.addEventListener('keydown', close, true);
		window.addEventListener('blur', close);
		return () => {
			window.removeEventListener('pointerdown', close, true);
			window.removeEventListener('keydown', close, true);
			window.removeEventListener('blur', close);
		};
	});
</script>

{#if pos}
	<div bind:this={menu} class="fixed popover p-1" {style} role="menu">
		{#each items as item, i (i)}
			{#if item === 'sep'}
				<div class="my-1 h-px bg-line"></div>
			{:else}
				<button
					role="menuitem"
					class="flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-gray-100"
					class:text-red-600={item.danger}
					onclick={() => {
						item.run();
						pos = null;
					}}
				>
					{item.label}
					{#if item.hint}<span class="ml-auto text-xs text-muted">{item.hint}</span>{/if}
				</button>
			{/if}
		{/each}
	</div>
{/if}
