<script lang="ts">
	import { authClient } from '$lib/client/auth';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';

	let newPassword = $state('');
	let confirm = $state('');
	let loading = $state(false);
	let done = $state(false);
	let error = $state('');

	const token = $derived($page.url.searchParams.get('token') ?? '');
	const tokenError = $derived($page.url.searchParams.get('error'));

	async function submit() {
		if (newPassword !== confirm) {
			error = 'Passwords do not match';
			return;
		}
		error = '';
		loading = true;
		try {
			const res = await authClient.resetPassword({ newPassword, token });
			if (res.error) {
				error = res.error.message ?? 'Failed to reset password';
			} else {
				done = true;
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

		{#if done}
			<div class="auth-header">
				<h1>Password updated</h1>
				<p>Your password has been reset. You can now sign in.</p>
			</div>
			<a href={resolve('/login')} class="submit-btn" style="display:block;text-align:center;text-decoration:none;">Sign in</a>
		{:else if tokenError || !token}
			<div class="auth-header">
				<h1>Link expired</h1>
				<p>This reset link is invalid or has expired. Please request a new one.</p>
			</div>
			<a href={resolve('/forgot-password')} class="submit-btn" style="display:block;text-align:center;text-decoration:none;">Request new link</a>
		{:else}
			<div class="auth-header">
				<h1>Set new password</h1>
				<p>Choose a new password for your account.</p>
			</div>

			{#if error}
				<div class="auth-error">{error}</div>
			{/if}

			<form onsubmit={(e) => { e.preventDefault(); submit(); }}>
				<div class="field">
					<label for="password">New password</label>
					<input id="password" type="password" placeholder="At least 8 characters" bind:value={newPassword} disabled={loading} />
				</div>

				<div class="field">
					<label for="confirm">Confirm password</label>
					<input id="confirm" type="password" placeholder="Repeat your password" bind:value={confirm} disabled={loading} />
				</div>

				<button type="submit" class="submit-btn" disabled={loading || !newPassword || !confirm} aria-busy={loading}>
					{loading ? '' : 'Reset password'}
				</button>
			</form>
		{/if}
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

	.field input {
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
</style>
