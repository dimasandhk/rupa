<script lang="ts">
	import { Popover } from 'bits-ui';
	import type { Snippet } from 'svelte';

	let {
		title,
		triggerClass = 'btn-ghost',
		trigger,
		children,
		width = 280,
		align = 'start',
		open = $bindable(false)
	}: {
		title: string;
		triggerClass?: string;
		trigger: Snippet;
		children: Snippet;
		width?: number;
		align?: 'start' | 'center' | 'end';
		open?: boolean;
	} = $props();
</script>

<Popover.Root bind:open>
	<Popover.Trigger class={triggerClass} {title} aria-label={title}>
		{@render trigger()}
	</Popover.Trigger>
	<Popover.Portal>
		<Popover.Content
			class="popover max-h-[70vh] overflow-x-hidden overflow-y-auto"
			style="width:{width}px"
			sideOffset={8}
			{align}
			collisionPadding={8}
		>
			{@render children()}
		</Popover.Content>
	</Popover.Portal>
</Popover.Root>
