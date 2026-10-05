import { redirect } from '@sveltejs/kit';
import { getDesign, requireUser } from '#lib/server/designs.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const d = await getDesign(event.params.id, user.id);
	// Templates owned by someone else open as the user's own copy.
	if (d.ownerId !== user.id) redirect(303, `/?template=${d.id}`);
	return { id: d.id, title: d.title, data: d.data, version: d.version };
};
