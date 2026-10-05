import type { Patches } from 'mutative';

export interface HistoryEntry<S> {
	patches: Patches;
	inverse: Patches;
	/** Consecutive entries with the same key (within MERGE_WINDOW) collapse into one. */
	key?: string;
	time: number;
	/** UI state to restore when this entry is undone. */
	before: S;
}

const MERGE_WINDOW = 1000;
const LIMIT = 200;

export class History<S> {
	undoStack: HistoryEntry<S>[] = [];
	redoStack: HistoryEntry<S>[] = [];

	push(entry: HistoryEntry<S>) {
		this.redoStack = [];
		const last = this.undoStack.at(-1);
		if (entry.key && last?.key === entry.key && entry.time - last.time < MERGE_WINDOW) {
			last.patches = [...last.patches, ...entry.patches];
			last.inverse = [...entry.inverse, ...last.inverse];
			last.time = entry.time;
			return;
		}
		this.undoStack.push(entry);
		if (this.undoStack.length > LIMIT) this.undoStack.shift();
	}

	/** Stop the current entry from absorbing the next change (e.g. on pointerup). */
	seal() {
		const last = this.undoStack.at(-1);
		if (last) last.key = undefined;
	}

	popUndo() {
		const e = this.undoStack.pop();
		if (e) this.redoStack.push(e);
		return e;
	}

	popRedo() {
		const e = this.redoStack.pop();
		if (e) this.undoStack.push(e);
		return e;
	}
}
