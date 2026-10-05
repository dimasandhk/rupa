import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { designDataSchema } from '#lib/editor/model/schema.ts';
import { deleteDesign, getDesign, requireUser, saveDesign } from '#lib/server/designs.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const user = requireUser(event, { api: true });
	const d = await getDesign(event.params.id, user.id);
	return json({ id: d.id, title: d.title, data: d.data, version: d.version });
};

const body = z.object({
	version: z.number().int(),
	title: z.string().min(1).max(200).optional(),
	data: designDataSchema.optional()
});

export const PUT: RequestHandler = async (event) => {
	const user = requireUser(event, { api: true });
	const parsed = body.safeParse(await event.request.json());
	if (!parsed.success) error(400, parsed.error.issues[0]?.message ?? 'Invalid design');
	const version = await saveDesign(event.params.id, user.id, parsed.data);
	return json({ version });
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireUser(event, { api: true });
	await deleteDesign(event.params.id, user.id);
	return new Response(null, { status: 204 });
};
