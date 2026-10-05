import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { createDesign as newDesignData } from '#lib/editor/model/factory.ts';
import { cloneWithNewIds, newId } from '#lib/editor/model/factory.ts';
import { designDataSchema } from '#lib/editor/model/schema.ts';
import { createDesign, getDesign, listDesigns, requireUser } from '#lib/server/designs.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const user = requireUser(event, { api: true });
	return json(await listDesigns(user.id));
};

const body = z.union([
	z.object({
		title: z.string().max(200).optional(),
		width: z.number().int().min(16).max(8000),
		height: z.number().int().min(16).max(8000)
	}),
	z.object({ title: z.string().max(200).optional(), sourceId: z.string() }),
	z.object({ title: z.string().max(200).optional(), data: designDataSchema })
]);

/** Create a blank design, a copy of a template or own design (`sourceId`), or one from raw data. */
export const POST: RequestHandler = async (event) => {
	const user = requireUser(event, { api: true });
	const parsed = body.safeParse(await event.request.json());
	if (!parsed.success) error(400, 'Invalid design');
	const input = parsed.data;

	let title = input.title ?? 'Untitled design';
	let data;
	if ('sourceId' in input) {
		const source = await getDesign(input.sourceId, user.id);
		title = input.title ?? source.title;
		data = structuredClone(source.data);
		for (const page of data.pages) {
			page.id = newId();
			page.elements = page.elements.map(cloneWithNewIds);
		}
	} else if ('data' in input) {
		data = input.data;
	} else {
		data = newDesignData(input.width, input.height);
	}
	const id = await createDesign(user.id, title, data);
	return json({ id }, { status: 201 });
};
