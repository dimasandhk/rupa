import { error, redirect, type RequestEvent } from '@sveltejs/kit';
import { and, desc, eq, or } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { DesignData } from '../editor/model/types';
import { db } from './db';
import { design } from './db/schema';
import { publicUrl } from './storage';

export function requireUser(
	event: Pick<RequestEvent, 'locals' | 'url'>,
	opts: { api?: boolean } = {}
) {
	const user = event.locals.user;
	if (!user) {
		if (opts.api) error(401, 'Not signed in');
		redirect(303, `/login?next=${encodeURIComponent(event.url.pathname)}`);
	}
	return user;
}

const summaryColumns = {
	id: design.id,
	title: design.title,
	width: design.width,
	height: design.height,
	thumbnailKey: design.thumbnailKey,
	templateCategory: design.templateCategory,
	updatedAt: design.updatedAt
};

export type DesignSummary = Awaited<ReturnType<typeof listDesigns>>[number];

const withThumb = <T extends { thumbnailKey: string | null }>(rows: T[]) =>
	rows.map(({ thumbnailKey, ...r }) => ({
		...r,
		thumbnail: thumbnailKey ? publicUrl(thumbnailKey) : null
	}));

export async function listDesigns(ownerId: string) {
	const rows = await db
		.select(summaryColumns)
		.from(design)
		.where(and(eq(design.ownerId, ownerId), eq(design.isTemplate, false)))
		.orderBy(desc(design.updatedAt));
	return withThumb(rows);
}

/** Templates are designs flagged `is_template`; every user can see and use them. */
export async function listTemplates() {
	const rows = await db
		.select(summaryColumns)
		.from(design)
		.where(eq(design.isTemplate, true))
		.orderBy(design.templateCategory, design.title);
	return withThumb(rows);
}

export async function getDesign(id: string, ownerId: string) {
	const [row] = await db
		.select()
		.from(design)
		.where(and(eq(design.id, id), or(eq(design.ownerId, ownerId), eq(design.isTemplate, true))));
	if (!row) error(404, 'Design not found');
	return row;
}

export async function createDesign(ownerId: string, title: string, data: DesignData) {
	const id = nanoid(14);
	await db
		.insert(design)
		.values({ id, ownerId, title, width: data.width, height: data.height, data });
	return id;
}

export async function saveDesign(
	id: string,
	ownerId: string,
	input: { title?: string; data?: DesignData; version: number }
) {
	const [current] = await db
		.select({ version: design.version, isTemplate: design.isTemplate })
		.from(design)
		.where(and(eq(design.id, id), eq(design.ownerId, ownerId)));
	if (!current) error(404, 'Design not found');
	if (current.version !== input.version) {
		error(409, 'This design was changed somewhere else. Reload to get the latest version.');
	}
	const version = current.version + 1;
	await db
		.update(design)
		.set({
			version,
			updatedAt: new Date(),
			...(input.title !== undefined && { title: input.title }),
			...(input.data && { data: input.data, width: input.data.width, height: input.data.height })
		})
		.where(and(eq(design.id, id), eq(design.ownerId, ownerId)));
	return version;
}

export async function setThumbnail(id: string, ownerId: string, key: string) {
	await db
		.update(design)
		.set({ thumbnailKey: key })
		.where(and(eq(design.id, id), eq(design.ownerId, ownerId)));
}

export async function deleteDesign(id: string, ownerId: string) {
	await db.delete(design).where(and(eq(design.id, id), eq(design.ownerId, ownerId)));
}
