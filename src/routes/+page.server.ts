import { listDesigns, listTemplates, requireUser } from '#lib/server/designs.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const [designs, templates] = await Promise.all([listDesigns(user.id), listTemplates()]);
	return { user: { name: user.name, email: user.email }, designs, templates };
};
