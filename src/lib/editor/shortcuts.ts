import { addImageFile, addLine, addShape, addText } from './insert';
import type { Editor } from './state/editor.svelte';

function isTyping(target: EventTarget | null) {
	const el = target as HTMLElement | null;
	return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
}

export interface ShortcutHooks {
	zoomBy: (factor: number) => void;
	zoomToFit: () => void;
	onError: (message: string) => void;
}

export function handleKeydown(e: KeyboardEvent, editor: Editor, hooks: ShortcutHooks) {
	if (isTyping(e.target) || editor.editingTextId) return;
	if (editor.cropId) {
		// Crop mode only understands apply / cancel.
		if (e.key === 'Enter' || e.key === 'Escape') {
			e.preventDefault();
			editor.endCrop(e.key === 'Enter');
		}
		return;
	}
	const mod = e.ctrlKey || e.metaKey;
	const key = e.key.toLowerCase();
	const has = editor.selectedIds.length > 0;
	const run = (fn: () => void) => {
		e.preventDefault();
		fn();
	};

	if (mod) {
		if (key === 'z' && !e.shiftKey) return run(() => editor.undo());
		if ((key === 'z' && e.shiftKey) || key === 'y') return run(() => editor.redo());
		if (key === 'c' && has) return run(() => editor.copy());
		if (key === 'x' && has) return run(() => editor.cut());
		if (key === 'd' && has) return run(() => editor.duplicateSelected());
		if (key === 'a') return run(() => editor.selectAll());
		if (key === 'g' && e.shiftKey) return run(() => editor.ungroupSelected());
		if (key === 'g') return run(() => editor.groupSelected());
		if (e.key === ']' && has) return run(() => editor.reorder(e.shiftKey ? 'front' : 'forward'));
		if (e.key === '[' && has) return run(() => editor.reorder(e.shiftKey ? 'back' : 'backward'));
		if (e.key === '=' || e.key === '+') return run(() => hooks.zoomBy(1.25));
		if (e.key === '-') return run(() => hooks.zoomBy(0.8));
		if (e.key === '0') return run(() => hooks.zoomToFit());
		return;
	}

	// Page navigation: PageUp/PageDown everywhere; ←/→ in slides view when nothing is selected.
	const pageStep =
		e.key === 'PageDown' || (editor.layout === 'slides' && !has && e.key === 'ArrowRight')
			? 1
			: e.key === 'PageUp' || (editor.layout === 'slides' && !has && e.key === 'ArrowLeft')
				? -1
				: 0;
	if (pageStep) return run(() => editor.setActivePage(editor.activePageIndex + pageStep));
	if ((e.key === 'Delete' || e.key === 'Backspace') && has)
		return run(() => editor.deleteSelected());
	if (e.key === 'Escape') return run(() => editor.clearSelection());
	if (e.key === 'Enter' && editor.selectedElements.length === 1) {
		const el = editor.selectedElements[0];
		if (el.type === 'text' && !el.locked) return run(() => (editor.editingTextId = el.id));
	}
	const step = e.shiftKey ? 10 : 1;
	const arrows: Record<string, [number, number]> = {
		ArrowLeft: [-step, 0],
		ArrowRight: [step, 0],
		ArrowUp: [0, -step],
		ArrowDown: [0, step]
	};
	if (arrows[e.key] && has) return run(() => editor.nudge(...arrows[e.key]));
	if (e.altKey || e.shiftKey) return;
	if (key === 't') return run(() => addText(editor));
	if (key === 'r') return run(() => addShape(editor, 'rect'));
	if (key === 'c') return run(() => addShape(editor, 'ellipse'));
	if (key === 'l') return run(() => addLine(editor));
}

export function handleKeyup(e: KeyboardEvent, editor: Editor) {
	if (e.key.startsWith('Arrow')) editor.sealHistory();
}

/** Paste images from the OS clipboard, our own elements, or plain text. */
export function handlePaste(e: ClipboardEvent, editor: Editor, hooks: ShortcutHooks) {
	if (isTyping(e.target) || editor.editingTextId) return;
	const data = e.clipboardData;
	if (!data) return;
	e.preventDefault();
	const file = [...data.files].find((f) => f.type.startsWith('image/'));
	if (file) {
		addImageFile(editor, file).catch((err) => hooks.onError(err.message));
		return;
	}
	const text = data.getData('text/plain');
	if (text && editor.pasteElements(text)) return;
	if (text.trim()) {
		addText(editor, { text: text.trim().slice(0, 2000), fontSize: 32 });
		return;
	}
	editor.pasteElements();
}
