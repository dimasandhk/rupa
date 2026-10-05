import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { auth } from '#lib/server/auth.ts';
import type { Actions, PageServerLoad } from './$types';

const safeNext = (url: URL) => {
	const next = url.searchParams.get('next') ?? '/';
	return next.startsWith('/') && !next.startsWith('//') ? next : '/';
};

export const load: PageServerLoad = (event) => {
	if (event.locals.user) redirect(303, safeNext(event.url));
	return {};
};

export const actions: Actions = {
	signIn: async (event) => {
		const form = await event.request.formData();
		const email = form.get('email')?.toString() ?? '';
		try {
			await auth.api.signInEmail({
				body: { email, password: form.get('password')?.toString() ?? '' }
			});
		} catch (err) {
			if (err instanceof APIError)
				return fail(400, { mode: 'signin', email, message: err.message || 'Sign in failed' });
			return fail(500, { mode: 'signin', email, message: 'Unexpected error' });
		}
		redirect(303, safeNext(event.url));
	},
	signUp: async (event) => {
		const form = await event.request.formData();
		const email = form.get('email')?.toString() ?? '';
		try {
			await auth.api.signUpEmail({
				body: {
					email,
					password: form.get('password')?.toString() ?? '',
					name: form.get('name')?.toString() || email.split('@')[0]
				}
			});
		} catch (err) {
			if (err instanceof APIError)
				return fail(400, { mode: 'signup', email, message: err.message || 'Sign up failed' });
			return fail(500, { mode: 'signup', email, message: 'Unexpected error' });
		}
		redirect(303, safeNext(event.url));
	},
	signOut: async (event) => {
		await auth.api.signOut({ headers: event.request.headers });
		redirect(303, '/login');
	}
};
