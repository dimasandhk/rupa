import { describe, expect, it } from 'vitest';
import { createDesign, createShape } from '../model/factory';
import { Editor } from './editor.svelte';

function editorWithShape() {
	const data = createDesign(1000, 1000);
	data.pages[0].elements.push(createShape('rect', { id: 'a', x: 0, y: 0 }));
	return new Editor({ id: 'd', title: 'Test', data });
}

describe('Editor history', () => {
	it('undoes and redoes changes with structural sharing', () => {
		const ed = editorWithShape();
		const before = ed.data;
		ed.updateElements(['a'], (el) => {
			el.x = 50;
		});
		expect(ed.data.pages[0].elements[0].x).toBe(50);
		expect(ed.canUndo).toBe(true);
		ed.undo();
		expect(ed.data.pages[0].elements[0].x).toBe(0);
		expect(ed.canRedo).toBe(true);
		ed.redo();
		expect(ed.data.pages[0].elements[0].x).toBe(50);
		expect(before.pages[0].elements[0].x).toBe(0);
	});

	it('merges keyed changes into one undo step', () => {
		const ed = editorWithShape();
		for (const v of [0.9, 0.8, 0.7]) {
			ed.updateElements(['a'], (el) => (el.opacity = v), { key: 'opacity' });
		}
		ed.undo();
		expect(ed.data.pages[0].elements[0].opacity).toBe(1);
		expect(ed.canUndo).toBe(false);
	});

	it('restores the selection on undo', () => {
		const ed = editorWithShape();
		ed.select(['a']);
		ed.deleteSelected();
		expect(ed.selectedIds).toEqual([]);
		ed.undo();
		expect(ed.selectedIds).toEqual(['a']);
	});

	it('does not record silent updates', () => {
		const ed = editorWithShape();
		ed.silentUpdate((d) => {
			d.pages[0].elements[0].height = 99;
		});
		expect(ed.data.pages[0].elements[0].height).toBe(99);
		expect(ed.canUndo).toBe(false);
	});

	it('duplicates, groups and pastes elements', () => {
		const ed = editorWithShape();
		ed.select(['a']);
		ed.duplicateSelected();
		expect(ed.activePage.elements).toHaveLength(2);
		ed.selectAll();
		ed.groupSelected();
		expect(ed.activePage.elements).toHaveLength(1);
		expect(ed.activePage.elements[0].type).toBe('group');
		ed.ungroupSelected();
		expect(ed.activePage.elements).toHaveLength(2);
		ed.undo();
		ed.undo();
		expect(ed.activePage.elements).toHaveLength(2);
		expect(ed.activePage.elements.every((e) => e.type === 'shape')).toBe(true);
	});

	it('duplicates pages and inserts template pages through drafts', () => {
		const ed = editorWithShape();
		ed.duplicatePage(0);
		expect(ed.data.pages).toHaveLength(2);
		expect(ed.data.pages[1].elements[0].id).not.toBe('a');
		const template = createDesign(2000, 1000);
		template.pages[0].elements.push(
			createShape('rect', { id: 't', x: 0, y: 0, width: 2000, height: 1000 })
		);
		ed.insertPages(template);
		expect(ed.data.pages).toHaveLength(3);
		const inserted = ed.data.pages[ed.activePageIndex].elements[0];
		expect(inserted.width).toBe(1000);
		expect(inserted.y).toBe(250);
	});
});
