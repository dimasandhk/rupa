<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Wordmark from '#lib/ui/Wordmark.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	// svelte-ignore state_referenced_locally
	let mode = $state<'signin' | 'signup'>(
		(form?.mode ?? page.url.searchParams.get('mode')) === 'signup' ? 'signup' : 'signin'
	);
	let pending = $state(false);
</script>

<svelte:head><title>{mode === 'signin' ? 'Log in' : 'Sign up'} · Rupa</title></svelte:head>

<main class="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
	<!-- Editorial side: a small composed "artboard" instead of a stock gradient. -->
	<section
		class="relative hidden overflow-hidden canvas-dots lg:flex lg:flex-col lg:justify-between lg:p-12"
	>
		<Wordmark size="lg" />
		<div class="relative mx-auto my-10 h-[22rem] w-full max-w-md" aria-hidden="true">
			<div
				class="absolute inset-x-10 top-6 bottom-0 -rotate-3 rounded-md bg-white shadow-page"
			></div>
			<div class="absolute inset-x-10 top-6 bottom-0 rotate-2 rounded-md bg-white p-8 shadow-page">
				<div class="size-24 rounded-full bg-brand"></div>
				<div class="mt-6 h-3 w-3/4 rounded-full bg-ink"></div>
				<div class="mt-2.5 h-3 w-1/2 rounded-full bg-ink/20"></div>
				<p class="absolute right-8 bottom-7 font-display text-5xl text-ink italic">rupa</p>
			</div>
		</div>
		<div>
			<h1 class="max-w-[16ch] font-display text-5xl leading-[1.02] font-medium">
				Give your ideas a shape.
			</h1>
			<p class="mt-4 max-w-[44ch] text-muted">
				<em class="font-display">Rupa</em> is Sanskrit for form. Make posts, slides and posters in a design
				studio you host yourself.
			</p>
		</div>
	</section>

	<section class="flex flex-col px-6 py-10 sm:px-12">
		<div class="lg:hidden"><Wordmark /></div>
		<div class="m-auto w-full max-w-sm py-10">
			<h2 class="font-display text-4xl font-medium">
				{mode === 'signin' ? 'Welcome back' : 'Make an account'}
			</h2>
			<p class="mt-2 text-muted">
				{mode === 'signin'
					? 'Log in to pick up where you left off.'
					: 'It takes a minute. Your designs stay on this server.'}
			</p>

			<form
				method="post"
				action={mode === 'signin' ? '?/signIn' : '?/signUp'}
				use:enhance={() => {
					pending = true;
					return async ({ update }) => {
						await update();
						pending = false;
					};
				}}
				class="mt-8 space-y-4"
			>
				{#if mode === 'signup'}
					<label class="block text-sm font-medium">
						Name
						<input name="name" class="mt-1.5 input h-11" autocomplete="name" />
					</label>
				{/if}
				<label class="block text-sm font-medium">
					Email
					<input
						name="email"
						type="email"
						required
						class="mt-1.5 input h-11"
						autocomplete="email"
						defaultValue={form?.email ?? ''}
						aria-invalid={form?.message ? true : undefined}
					/>
				</label>
				<label class="block text-sm font-medium">
					Password
					<input
						name="password"
						type="password"
						required
						minlength="8"
						class="mt-1.5 input h-11"
						autocomplete={mode === 'signin' ? 'current-password' : 'new-password'}
						aria-describedby="password-hint"
					/>
					<span id="password-hint" class="mt-1.5 block text-xs font-normal text-muted"
						>At least 8 characters.</span
					>
				</label>
				{#if form?.message}
					<p
						class="rounded-lg border-l-2 border-brand bg-brand-50 px-3 py-2 text-sm text-brand-600"
						role="alert"
					>
						{form.message}
					</p>
				{/if}
				<button class="btn-primary h-11 w-full" disabled={pending}>
					{#if pending}{mode === 'signin' ? 'Logging in…' : 'Creating account…'}{:else}{mode ===
						'signin'
							? 'Log in'
							: 'Sign up'}{/if}
				</button>
			</form>

			<p class="mt-6 text-sm text-muted">
				{mode === 'signin' ? 'New to Rupa?' : 'Already have an account?'}
				<button
					type="button"
					class="font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-brand"
					onclick={() => (mode = mode === 'signin' ? 'signup' : 'signin')}
				>
					{mode === 'signin' ? 'Sign up' : 'Log in'}
				</button>
			</p>
		</div>
	</section>
</main>
