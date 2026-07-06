<script lang="ts">
	let phone = $state('');
	let code = $state('');
	let step = $state<'phone' | 'otp'>('phone');
	let error = $state('');
	let loading = $state(false);
	let submittedPhone = $state('');

	async function submitPhone() {
		error = '';
		loading = true;
		try {
			const res = await fetch('/api/phone/submit', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ phone })
			});
			const data = (await res.json()) as { error?: string; phone?: string };
			if (!res.ok) {
				error = data.error ?? 'Something went wrong';
			} else {
				submittedPhone = data.phone ?? phone;
				step = 'otp';
			}
		} catch {
			error = 'Network error. Please try again.';
		} finally {
			loading = false;
		}
	}

	async function submitCode() {
		error = '';
		loading = true;
		try {
			const res = await fetch('/api/phone/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code })
			});
			const data = (await res.json()) as { error?: string };
			if (!res.ok) {
				error = data.error ?? 'Something went wrong';
			} else {
				window.location.href = '/';
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
		{#if step === 'phone'}
			<hgroup>
				<h2>Verify your phone</h2>
				<p>
					A real mobile number is required to post, message, and report. VoIP numbers are not
					accepted.
				</p>
			</hgroup>

			{#if error}
				<p class="error">{error}</p>
			{/if}

			<label for="phone">
				Mobile number
				<input
					id="phone"
					type="tel"
					placeholder="+1 555 000 0000"
					bind:value={phone}
					disabled={loading}
				/>
			</label>

			<button onclick={submitPhone} disabled={loading || !phone} aria-busy={loading}>
				{loading ? '' : 'Send verification code'}
			</button>
		{:else}
			<hgroup>
				<h2>Enter your code</h2>
				<p>We sent a 6-digit code to <strong>{submittedPhone}</strong>.</p>
			</hgroup>

			{#if error}
				<p class="error">{error}</p>
			{/if}

			<label for="code">
				Verification code
				<input
					id="code"
					type="text"
					inputmode="numeric"
					maxlength="6"
					placeholder="123456"
					bind:value={code}
					disabled={loading}
					class="otp-input"
				/>
			</label>

			<button onclick={submitCode} disabled={loading || code.length < 6} aria-busy={loading}>
				{loading ? '' : 'Confirm'}
			</button>

			<button
				class="back-btn"
				onclick={() => {
					step = 'phone';
					error = '';
				}}
				disabled={loading}
			>
				Use a different number
			</button>
		{/if}
	</article>
</div>

<style>
	.auth-wrap {
		max-width: 480px;
		margin: 4rem auto;
	}

	button {
		width: 100%;
		margin-bottom: 0.5rem;
	}

	.error {
		color: var(--pico-del-color);
		font-size: 0.875rem;
	}

	.otp-input {
		letter-spacing: 0.4rem;
		font-size: 1.5rem;
		text-align: center;
	}

	.back-btn {
		background: transparent;
		border-color: var(--pico-muted-border-color);
		color: var(--pico-muted-color);
	}

	.back-btn:hover:not(:disabled) {
		background: transparent;
		border-color: var(--pico-primary);
		color: var(--pico-primary);
	}
</style>
