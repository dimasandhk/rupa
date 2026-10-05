import { getDesign, requireUser } from '#lib/server/designs.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const d = await getDesign(event.params.id, user.id);
	return { id: d.id, title: d.title, data: d.data };
};
