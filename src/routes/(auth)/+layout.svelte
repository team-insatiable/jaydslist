<script lang="ts">
	let { children } = $props();
</script>

<main class="auth-page">
	{@render children()}
</main>

<style>
	.auth-page {
		position: relative;
		isolation: isolate;
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem 1rem;
		background:
			radial-gradient(
				circle at 15% 15%,
				color-mix(in srgb, var(--pico-primary) 12%, transparent),
				transparent 28rem
			),
			radial-gradient(
				circle at 90% 90%,
				color-mix(in srgb, var(--pico-primary) 8%, transparent),
				transparent 24rem
			);
	}

	.auth-page :global(.auth-card) {
		border-top: 3px solid var(--pico-primary);
		box-shadow: 0 20px 65px rgba(0, 0, 0, 0.08);
	}

	.auth-page :global(.auth-header h1) {
		letter-spacing: -0.045em;
	}
</style>
