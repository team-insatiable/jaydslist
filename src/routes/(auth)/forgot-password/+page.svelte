<script lang="ts">
	import { authClient } from '$lib/client/auth';
	import { resolve } from '$app/paths';

	let email = $state('');
	let loading = $state(false);
	let sent = $state(false);
	let error = $state('');

	async function submit() {
		error = '';
		loading = true;
		try {
			const res = await authClient.requestPasswordReset({
				email,
				redirectTo: `${window.location.origin}/reset-password`
			});
			if (res.error) {
				error = res.error.message ?? 'Something went wrong';
			} else {
				sent = true;
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

		{#if sent}
			<div class="auth-header">
				<h1>Check your email</h1>
				<p>If that address is in our system, we've sent a reset link. Check your inbox.</p>
			</div>
			<a href={resolve('/login')} class="back-link">Back to sign in</a>
		{:else}
			<div class="auth-header">
				<h1>Forgot password?</h1>
				<p>Enter your email and we'll send you a reset link.</p>
			</div>

			{#if error}
				<div class="auth-error">{error}</div>
			{/if}

			<form
				onsubmit={(e) => {
					e.preventDefault();
					submit();
				}}
			>
				<div class="field">
					<label for="email">Email</label>
					<div class="input-wrap">
						<svg
							class="input-icon"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<rect x="2" y="4" width="20" height="16" rx="2" /><path
								d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"
							/>
						</svg>
						<input
							id="email"
							type="email"
							placeholder="you@example.com"
							bind:value={email}
							disabled={loading}
						/>
					</div>
				</div>

				<button type="submit" class="submit-btn" disabled={loading || !email} aria-busy={loading}>
					{loading ? '' : 'Send reset link'}
				</button>
			</form>

			<p class="switch-link"><a href={resolve('/login')}>Back to sign in</a></p>
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

	.back-link {
		display: block;
		text-align: center;
		font-size: 0.875rem;
		margin-top: 1.5rem;
	}
</style>
