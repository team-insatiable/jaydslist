<script lang="ts">
	import { authClient } from '$lib/client/auth';
	import { resolve } from '$app/paths';

	let email = $state('');
	let password = $state('');
	let rememberMe = $state(false);
	let error = $state('');
	let loading = $state(false);

	async function login() {
		error = '';
		loading = true;
		try {
			const res = await authClient.signIn.email({ email, password, rememberMe });
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
	<div class="auth-card">
		<div class="auth-brand">
			<span class="wordmark">Jaydslist</span>
		</div>

		<div class="auth-header">
			<h1>Welcome back</h1>
			<p>Sign in to your account</p>
		</div>

		{#if error}
			<div class="auth-error">{error}</div>
		{/if}

		<form onsubmit={(e) => { e.preventDefault(); login(); }}>
		<div class="field">
			<label for="email">Email</label>
			<div class="input-wrap">
				<svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
				</svg>
				<input id="email" type="email" placeholder="you@example.com" bind:value={email} disabled={loading} />
			</div>
		</div>

		<div class="field">
			<label for="password">Password</label>
			<div class="input-wrap">
				<svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
				</svg>
				<input id="password" type="password" placeholder="Your password" bind:value={password} disabled={loading} />
			</div>
			<a href={resolve('/forgot-password')} class="forgot">Forgot password?</a>
		</div>

		<label class="remember-row">
			<input type="checkbox" bind:checked={rememberMe} />
			Remember me
		</label>

		<button type="submit" class="submit-btn" disabled={loading || !email || !password} aria-busy={loading}>
			{loading ? '' : 'Sign in'}
		</button>
		</form>

		<p class="switch-link">Don't have an account? <a href={resolve('/register')}>Sign up</a></p>
	</div>
</div>

<style>
	.auth-wrap {
		width: 100%;
		max-width: 400px;
	}

	.auth-card {
		background: var(--pico-card-background-color);
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 12px;
		padding: 2.5rem;
	}

	.auth-brand {
		text-align: center;
		margin-bottom: 1.75rem;
	}

	.wordmark {
		font-size: 1.5rem;
		font-weight: 800;
		letter-spacing: -0.04em;
		color: var(--pico-primary);
	}

	.auth-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.auth-header h1 {
		font-size: 1.4rem;
		font-weight: 700;
		margin-bottom: 0.25rem;
	}

	.auth-header p {
		font-size: 0.875rem;
		color: var(--pico-muted-color);
		margin: 0;
	}

	.field {
		margin-bottom: 1.25rem;
	}

	.field label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		margin-bottom: 0.4rem;
	}

	.forgot {
		display: block;
		text-align: right;
		margin-top: 0.4rem;
		font-size: 0.8rem;
		color: var(--pico-muted-color);
	}

	.forgot:hover {
		color: var(--pico-primary);
	}

	.input-wrap {
		position: relative;
	}

	.input-wrap {
		position: relative;
	}

	.input-icon {
		position: absolute;
		left: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		width: 16px;
		height: 16px;
		color: var(--pico-muted-color);
		pointer-events: none;
	}

	.input-wrap input {
		padding-left: 2.5rem;
		margin-bottom: 0;
	}

	.auth-error {
		background: color-mix(in srgb, var(--pico-del-color) 10%, transparent);
		border: 1px solid color-mix(in srgb, var(--pico-del-color) 30%, transparent);
		color: var(--pico-del-color);
		padding: 0.75rem 1rem;
		border-radius: 8px;
		font-size: 0.875rem;
		margin-bottom: 1.25rem;
	}

	.remember-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: var(--pico-muted-color);
		margin-bottom: 1rem;
		cursor: pointer;
	}

	.remember-row input {
		margin: 0;
		width: auto;
	}

	.submit-btn {
		width: 100%;
		margin-top: 0.5rem;
		padding: 0.75rem;
		font-size: 0.95rem;
		font-weight: 600;
		background: var(--pico-primary);
		color: #fff;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition: background 0.15s;
	}

	.submit-btn:hover:not(:disabled) {
		background: var(--pico-primary-hover);
	}

	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.switch-link {
		text-align: center;
		font-size: 0.875rem;
		color: var(--pico-muted-color);
		margin-top: 1.5rem;
		margin-bottom: 0;
	}
</style>
