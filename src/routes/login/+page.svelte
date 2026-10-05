<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	// svelte-ignore state_referenced_locally
	let mode = $state<'signin' | 'signup'>(
		(form?.mode ?? page.url.searchParams.get('mode')) === 'signup' ? 'signup' : 'signin'
	);
</script>

<svelte:head><title>Sign in · Dimva</title></svelte:head>

<main
	class="grid min-h-full place-items-center bg-gradient-to-br from-[#00c4cc] via-[#6a5cff] to-[#8b3dff] p-6"
>
	<div class="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
		<div class="mb-6 text-center">
			<div class="text-3xl font-extrabold tracking-tight text-brand">Dimva</div>
			<p class="mt-1 text-sm text-muted">
				{mode === 'signin' ? 'Log in to keep designing' : 'Create an account to start designing'}
			</p>
		</div>

		<form
			method="post"
			action={mode === 'signin' ? '?/signIn' : '?/signUp'}
			use:enhance
			class="space-y-3"
		>
			{#if mode === 'signup'}
				<label class="block text-sm font-medium">
					Name
					<input name="name" class="mt-1 input" autocomplete="name" />
				</label>
			{/if}
			<label class="block text-sm font-medium">
				Email
				<input
					name="email"
					type="email"
					required
					class="mt-1 input"
					autocomplete="email"
					defaultValue={form?.email ?? ''}
				/>
			</label>
			<label class="block text-sm font-medium">
				Password
				<input
					name="password"
					type="password"
					required
					minlength="8"
					class="mt-1 input"
					autocomplete={mode === 'signin' ? 'current-password' : 'new-password'}
				/>
			</label>
			{#if form?.message}
				<p class="text-sm text-red-600" role="alert">{form.message}</p>
			{/if}
			<button class="btn-primary w-full">{mode === 'signin' ? 'Log in' : 'Sign up'}</button>
		</form>

		<p class="mt-5 text-center text-sm text-muted">
			{mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
			<button
				type="button"
				class="font-medium text-brand hover:underline"
				onclick={() => (mode = mode === 'signin' ? 'signup' : 'signin')}
			>
				{mode === 'signin' ? 'Sign up' : 'Log in'}
			</button>
		</p>
	</div>
</main>
