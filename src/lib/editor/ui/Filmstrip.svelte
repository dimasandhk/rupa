<script lang="ts">
	import {
		ArrowLeft,
		ArrowRight,
		CopyPlus,
		FilePlus2,
		MoreHorizontal,
		Pencil,
		Plus,
		Trash2
	} from '#lib/icons.ts';
	import { DropdownMenu } from 'bits-ui';
	import { tick } from 'svelte';
	import { getEditor } from '../context';
	import SlideThumb from './SlideThumb.svelte';

	const editor = getEditor();
	const THUMB_H = 64;

	const pages = $derived(editor.data.pages);
	const thumbW = $derived(
		Math.round(Math.min(160, Math.max(40, (THUMB_H * editor.data.width) / editor.data.height)))
	);

	let strip: HTMLOListElement;
	let renaming = $state<string | null>(null);
	let dragFrom = $state<number | null>(null);
	let dragOver = $state<number | null>(null);

	// Keep the active slide's thumbnail in view (keyboard paging, templates, undo).
	$effect(() => {
		const i = editor.activePageIndex;
		tick().then(() =>
			strip
				?.querySelector(`[data-slide="${i}"]`)
				?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
		);
	});

	async function startRename(id: string) {
		renaming = id;
		await tick();
		const input = strip.querySelector<HTMLInputElement>(`[data-rename="${id}"]`);
		input?.focus();
		input?.select();
	}

	function finishRename(index: number, value: string, save: boolean) {
		if (save && (pages[index]?.title ?? '') !== value.trim()) editor.renamePage(index, value);
		renaming = null;
	}

	function addAfter(index: number) {
		editor.setActivePage(index);
		editor.addPage();
	}

	const item =
		'flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm data-highlighted:bg-gray-100 data-disabled:opacity-40';
</script>

<nav
	class="shrink-0 border-t border-line/80 bg-paper/70 px-3 pt-3 backdrop-blur"
	aria-label="Slides"
>
	<ol bind:this={strip} class="flex items-start gap-3 overflow-x-auto px-1 pb-2">
		{#each pages as page, i (page.id)}
			{@const active = editor.activePageIndex === i}
			<li
				class="group/slide relative shrink-0"
				style:width="{thumbW}px"
				data-slide={i}
				draggable={renaming !== page.id}
				ondragstart={(e) => {
					dragFrom = i;
					e.dataTransfer?.setData('text/plain', String(i));
				}}
				ondragover={(e) => {
					if (dragFrom === null) return;
					e.preventDefault();
					dragOver = i;
				}}
				ondragleave={() => dragOver === i && (dragOver = null)}
				ondrop={(e) => {
					e.preventDefault();
					if (dragFrom !== null && dragFrom !== i) editor.movePage(dragFrom, i);
					dragFrom = dragOver = null;
				}}
				ondragend={() => (dragFrom = dragOver = null)}
			>
				<button
					class="block w-full overflow-hidden rounded-lg bg-white shadow-soft ring-offset-2 ring-offset-paper transition duration-200 ease-(--ease-spring) hover:-translate-y-0.5 {active
						? 'ring-2 ring-brand'
						: 'ring-1 ring-line hover:ring-ink/25'} {dragOver === i && dragFrom !== i
						? 'ring-2 ring-brand/60'
						: ''} {dragFrom === i ? 'opacity-40' : ''}"
					style:height="{THUMB_H}px"
					aria-label="Slide {i + 1}{page.title ? `: ${page.title}` : ''}"
					aria-current={active ? 'page' : undefined}
					onclick={() => editor.setActivePage(i)}
				>
					<SlideThumb {page} index={i} height={THUMB_H} />
				</button>

				<div class="mt-1 flex h-5 items-center gap-1 text-[11px]">
					<span class="font-medium tabular-nums {active ? 'text-ink' : 'text-muted'}">{i + 1}</span>
					{#if renaming === page.id}
						<input
							data-rename={page.id}
							class="h-5 min-w-0 flex-1 rounded bg-white px-1 text-[11px] ring-1 ring-brand/50 outline-none"
							value={page.title ?? ''}
							maxlength="200"
							placeholder="Add title"
							aria-label="Slide {i + 1} title"
							onkeydown={(e) => {
								e.stopPropagation();
								if (e.key === 'Enter') finishRename(i, e.currentTarget.value, true);
								if (e.key === 'Escape') finishRename(i, '', false);
							}}
							onblur={(e) => finishRename(i, e.currentTarget.value, true)}
						/>
					{:else}
						<button
							class="min-w-0 flex-1 truncate text-left {page.title
								? 'text-ink/80'
								: 'text-transparent group-hover/slide:text-muted/70'}"
							title={page.title
								? `${page.title} (double-click to rename)`
								: 'Double-click to add a title'}
							ondblclick={() => startRename(page.id)}
						>
							{page.title ?? 'Add title'}
						</button>
					{/if}
				</div>

				<DropdownMenu.Root>
					<DropdownMenu.Trigger
						class="absolute top-1 right-1 grid size-6 place-items-center rounded-md bg-white/95 opacity-0 shadow-soft ring-1 ring-line transition group-hover/slide:opacity-100 focus:opacity-100 data-[state=open]:opacity-100"
						aria-label="Slide {i + 1} options"
					>
						<MoreHorizontal class="size-3.5" weight="bold" />
					</DropdownMenu.Trigger>
					<DropdownMenu.Portal>
						<DropdownMenu.Content class="popover w-48 p-1" side="top" align="start" sideOffset={6}>
							<DropdownMenu.Item class={item} onSelect={() => startRename(page.id)}>
								<Pencil class="size-4" />
								{page.title ? 'Rename' : 'Add title'}
							</DropdownMenu.Item>
							<DropdownMenu.Item class={item} onSelect={() => editor.duplicatePage(i)}>
								<CopyPlus class="size-4" /> Duplicate
							</DropdownMenu.Item>
							<DropdownMenu.Item class={item} onSelect={() => addAfter(i)}>
								<FilePlus2 class="size-4" /> Add slide after
							</DropdownMenu.Item>
							<DropdownMenu.Item
								class={item}
								disabled={i === 0}
								onSelect={() => editor.movePage(i, i - 1)}
							>
								<ArrowLeft class="size-4" /> Move left
							</DropdownMenu.Item>
							<DropdownMenu.Item
								class={item}
								disabled={i === pages.length - 1}
								onSelect={() => editor.movePage(i, i + 1)}
							>
								<ArrowRight class="size-4" /> Move right
							</DropdownMenu.Item>
							<DropdownMenu.Item
								class="{item} text-brand-600 data-highlighted:bg-brand-50"
								disabled={pages.length === 1}
								onSelect={() => editor.deletePage(i)}
							>
								<Trash2 class="size-4" /> Delete
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Portal>
				</DropdownMenu.Root>
			</li>
		{/each}
		<li class="shrink-0">
			<button
				class="grid place-items-center rounded-lg border border-dashed border-ink/20 text-muted transition duration-200 ease-(--ease-spring) hover:border-brand hover:bg-white/70 hover:text-brand active:scale-95"
				style:width="{thumbW}px"
				style:height="{THUMB_H}px"
				aria-label="Add slide"
				title="Add slide"
				onclick={() => addAfter(pages.length - 1)}
			>
				<Plus class="size-5" />
			</button>
		</li>
	</ol>
</nav>
