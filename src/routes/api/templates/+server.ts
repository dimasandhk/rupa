import { json } from '@sveltejs/kit';
import { listTemplates, requireUser } from '#lib/server/designs.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	requireUser(event, { api: true });
	return json(await listTemplates());
};
