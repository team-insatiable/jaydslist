<script lang="ts">
	import { authClient } from '$lib/client/auth';
	import { resolve } from '$app/paths';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	async function login() {
		error = '';
		loading = true;
		try {
			const res = await authClient.signIn.email({ email, password });
			if (res.error) {
				error = res.error.message ?? 'Invalid email or password';
			} else {
				window.location.href = resolve('/');
			}
		} catch {
			error = 'Network error. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<div class="auth-wrap">
	<article>
		<hgroup>
			<h2>Sign in</h2>
			<p>New here? <a href={resolve('/register')}>Sign up now</a></p>
		</hgroup>

		{#if error}
			<p class="error">{error}</p>
		{/if}

		<label for="email">
			Email
			<input id="email" type="email" placeholder="you@example.com" bind:value={email} disabled={loading} />
		</label>

		<label for="password">
			Password
			<input id="password" type="password" placeholder="Your password" bind:value={password} disabled={loading} />
		</label>

		<small><a href={resolve('/forgot-password')}>Forgot password?</a></small>

		<button onclick={login} disabled={loading || !email || !password} aria-busy={loading}>
			{loading ? '' : 'Sign in'}
		</button>
	</article>
</div>

<style>
	.auth-wrap {
		max-width: 420px;
		margin: 4rem auto;
	}

	small {
		display: block;
		text-align: right;
		margin-bottom: var(--pico-spacing);
	}

	button {
		width: 100%;
	}

	.error {
		color: var(--pico-del-color);
		font-size: 0.875rem;
	}
</style>
