import { getContext, setContext } from 'svelte';
import type { Editor } from './state/editor.svelte';

const KEY = Symbol('editor');

export function setEditor(editor: Editor) {
	setContext(KEY, editor);
	return editor;
}

export function getEditor(): Editor {
	const editor = getContext<Editor>(KEY);
	if (!editor) throw new Error('getEditor() called outside of an editor');
	return editor;
}
