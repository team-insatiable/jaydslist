<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';

	let { data, form } = $props();

	let body = $state('');
	let sending = $state(false);

	const minLength = data.minLength;
</script>

<div class="compose-page">
	<a href={resolve(`/listings/${data.listing.id}`)} class="back-link">
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<polyline points="15 18 9 12 15 6"></polyline>
		</svg>
		Back to listing
	</a>

	<div class="listing-context card">
		<span class="context-label">Replying to</span>
		<p class="listing-subject">{data.listing.subject}</p>
		<span class="poster-alias">Posted by {data.listing.posterAlias}</span>
	</div>

	<div class="compose-card card">
		<h2>Your message</h2>
		<p class="hint">
			Introduce yourself and explain why you're reaching out. Minimum {minLength} characters. Contact
			information is not allowed in your first message.
		</p>

		{#if form?.error}
			<p class="error">{form.error}</p>
		{/if}

		<form
			method="POST"
			action="?/send&listing={data.listing.id}"
			use:enhance={() => {
				sending = true;
				return async ({ result, update }) => {
					if (result.type !== 'redirect') sending = false;
					await update();
				};
			}}
		>
			<textarea
				name="body"
				bind:value={body}
				placeholder="Write a genuine introduction…"
				rows="8"
				disabled={sending}
			></textarea>

			<div class="char-count {body.trim().length < minLength ? 'short' : 'ok'}">
				{body.trim().length} / {minLength} minimum
			</div>

			<button
				type="submit"
				aria-busy={sending}
				disabled={sending || body.trim().length < minLength}
			>
				{sending ? '' : 'Send message'}
			</button>
		</form>
	</div>
</div>

<style>
	.compose-page {
		max-width: 560px;
		margin-inline: auto;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.875rem;
		color: var(--pico-muted-color);
		text-decoration: none;
		margin-bottom: 1rem;
	}

	.card {
		background: var(--pico-card-background-color);
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 10px;
		padding: 1.25rem;
		margin-bottom: 1rem;
	}

	.listing-context {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.context-label {
		font-size: 0.75rem;
		color: var(--pico-muted-color);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		font-weight: 500;
	}

	.listing-subject {
		font-weight: 600;
		font-size: 0.95rem;
		margin: 0;
	}

	.poster-alias {
		font-size: 0.8rem;
		color: var(--pico-muted-color);
	}

	h2 {
		font-size: 1rem;
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	.hint {
		font-size: 0.825rem;
		color: var(--pico-muted-color);
		margin-bottom: 1rem;
	}

	.error {
		color: var(--pico-del-color);
		font-size: 0.875rem;
		margin-bottom: 0.75rem;
	}

	textarea {
		width: 100%;
		resize: vertical;
		font-size: 0.9rem;
	}

	.char-count {
		font-size: 0.75rem;
		text-align: right;
		margin-top: 0.25rem;
		margin-bottom: 0.75rem;
	}

	.char-count.short {
		color: var(--pico-muted-color);
	}
	.char-count.ok {
		color: var(--pico-ins-color);
	}

	button {
		width: 100%;
	}
</style>
