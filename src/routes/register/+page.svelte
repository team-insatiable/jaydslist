<script lang="ts">
	import { authClient } from '$lib/client/auth';
	import { resolve } from '$app/paths';

	let email = $state('');
	let password = $state('');
	let confirm = $state('');
	let error = $state('');
	let loading = $state(false);

	async function register() {
		error = '';

		if (password !== confirm) {
			error = 'Passwords do not match';
			return;
		}

		if (password.length < 8) {
			error = 'Password must be at least 8 characters';
			return;
		}

		loading = true;
		try {
			const res = await authClient.signUp.email({ email, password, name: email });
			if (res.error) {
				error = res.error.message ?? 'Registration failed';
			} else {
				window.location.href = resolve('/verify-phone');
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
			<h2>Create an account</h2>
			<p>Already have one? <a href={resolve('/login')}>Sign in</a></p>
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
			<input id="password" type="password" placeholder="At least 8 characters" bind:value={password} disabled={loading} />
		</label>

		<label for="confirm">
			Confirm password
			<input id="confirm" type="password" placeholder="Repeat your password" bind:value={confirm} disabled={loading} />
		</label>

		<button onclick={register} disabled={loading || !email || !password || !confirm} aria-busy={loading}>
			{loading ? '' : 'Create account'}
		</button>
	</article>
</div>

<style>
	.auth-wrap {
		max-width: 420px;
		margin: 4rem auto;
	}

	button {
		width: 100%;
	}

	.error {
		color: var(--pico-del-color);
		font-size: 0.875rem;
	}
</style>
