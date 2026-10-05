import { cloneWithNewIds, createPage, deepClone, newId } from '../model/factory';
import type { DesignData } from '../model/types';

export function addPage(data: DesignData, afterIndex: number): number {
	const background = data.pages[afterIndex]?.background.color ?? '#ffffff';
	data.pages.splice(afterIndex + 1, 0, createPage(background));
	return afterIndex + 1;
}

export function duplicatePage(data: DesignData, index: number): number {
	const src = data.pages[index];
	data.pages.splice(index + 1, 0, {
		...deepClone(src),
		id: newId(),
		elements: src.elements.map(cloneWithNewIds)
	});
	return index + 1;
}

/** Deletes a page (never the last one). Returns the index to activate. */
export function deletePage(data: DesignData, index: number): number {
	if (data.pages.length <= 1) return 0;
	data.pages.splice(index, 1);
	return Math.min(index, data.pages.length - 1);
}

export function movePage(data: DesignData, from: number, to: number): number {
	if (to < 0 || to >= data.pages.length || from === to) return from;
	const [page] = data.pages.splice(from, 1);
	data.pages.splice(to, 0, page);
	return to;
}
