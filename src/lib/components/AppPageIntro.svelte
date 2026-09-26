<script lang="ts">
	let { eyebrow, title, description }: { eyebrow: string; title: string; description: string } =
		$props();
</script>

<header class="page-intro">
	<p class="eyebrow">{eyebrow}</p>
	<h1>{title}</h1>
	<p class="description">{description}</p>
</header>

<style>
	.page-intro {
		padding: 1rem 0 2rem;
		margin-bottom: 2rem;
		border-bottom: 1px solid var(--pico-muted-border-color);
	}
	.eyebrow {
		color: var(--pico-primary);
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		margin-bottom: 0.9rem;
	}
	h1 {
		font-size: clamp(2.4rem, 5vw, 3.75rem);
		font-weight: 500;
		font-family: Georgia, serif;
		line-height: 1.08;
		letter-spacing: -0.045em;
		text-wrap: balance;
	}
	.description {
		max-width: 36rem;
		margin-top: 1rem;
		color: var(--pico-muted-color);
		font-size: 1rem;
		line-height: 1.7;
	}
	@media (max-width: 600px) {
		.page-intro {
			padding-top: 0.5rem;
			margin-bottom: 1.5rem;
		}
	}
</style>
