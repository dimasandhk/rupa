<script lang="ts">
	import { fillToCss, isGradient } from '../color/color';
	import type { TextElement } from '../model/types';

	let { el, zoom, oncommit }: { el: TextElement; zoom: number; oncommit: (text: string) => void } =
		$props();

	// The textarea owns the text while editing.
	// svelte-ignore state_referenced_locally
	let value = $state(el.text);
	let textarea: HTMLTextAreaElement;
	let done = false;

	function autosize() {
		textarea.style.height = '0px';
		textarea.style.height = `${textarea.scrollHeight}px`;
	}

	function commit() {
		if (done) return;
		done = true;
		oncommit(value);
	}

	$effect(() => {
		textarea.focus();
		textarea.select();
		autosize();
		// Clicking elsewhere on the canvas can close the editor before `blur` fires.
		return commit;
	});
</script>

<textarea
	bind:this={textarea}
	bind:value
	oninput={autosize}
	onblur={commit}
	onkeydown={(e) => {
		e.stopPropagation();
		if (e.key === 'Escape') commit();
	}}
	spellcheck="false"
	style:left="{el.x * zoom}px"
	style:top="{el.y * zoom}px"
	style:width="{el.width * zoom}px"
	style:transform="rotate({el.rotation}deg)"
	style:font-family={`"${el.fontFamily}"`}
	style:font-size="{el.fontSize * zoom}px"
	style:font-weight={el.fontWeight}
	style:font-style={el.italic ? 'italic' : 'normal'}
	style:line-height={el.lineHeight}
	style:letter-spacing="{el.letterSpacing * zoom}px"
	style:text-align={el.align}
	style:color={isGradient(el.fill) ? 'transparent' : el.fill}
	style:background-image={isGradient(el.fill) ? fillToCss(el.fill) : undefined}
	style:background-clip={isGradient(el.fill) ? 'text' : undefined}
	style:caret-color={isGradient(el.fill) ? el.fill.stops[0]?.color : undefined}
	style:text-transform={el.uppercase ? 'uppercase' : 'none'}
	style:text-decoration={[el.underline && 'underline', el.strike && 'line-through']
		.filter(Boolean)
		.join(' ') || 'none'}
	style:opacity={el.opacity}></textarea>

<style>
	textarea {
		position: absolute;
		z-index: 10;
		margin: 0;
		padding: 0;
		border: none;
		outline: 1.5px solid var(--color-brand, #c2553a);
		background: transparent;
		resize: none;
		overflow: hidden;
		white-space: pre-wrap;
		overflow-wrap: break-word;
		transform-origin: top left;
	}
</style>
