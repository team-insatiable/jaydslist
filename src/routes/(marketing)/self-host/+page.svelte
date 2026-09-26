<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Self-host {data.instanceName}</title>
	<meta name="description" content={`Run your own independent instance of ${data.instanceName}.`} />
</svelte:head>

<main class="self-host-page">
	<section class="hero">
		<p class="eyebrow">Open source</p>
		<h1>Run your own {data.instanceName}</h1>
		<p class="lead">
			{data.instanceName} is AGPL-licensed software. You can inspect how it works, contribute to the project,
			or run an independent instance for your own community.
		</p>
		<a class="source-link" href={data.sourceUrl}>View the source repository</a>
	</section>

	<section class="next-steps" aria-labelledby="next-steps-heading">
		<h2 id="next-steps-heading">Getting started</h2>
		<p>
			The repository contains the application, database migrations, local development setup, and
			canonical operator documentation. Read the self-hosting guide there before creating or
			deploying an instance.
		</p>
		<a class="docs-link" href={data.docsUrl}>Read the self-hosting guide →</a>
	</section>
</main>

<style>
	.self-host-page {
		max-width: 760px;
		margin-inline: auto;
		padding: 0 1.5rem 5rem;
	}

	.hero {
		padding: 4rem 0 3rem;
		max-width: 640px;
	}

	.eyebrow {
		margin-bottom: 0.75rem;
		color: var(--pico-primary);
		font-size: 0.8125rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	h1 {
		margin-bottom: 1rem;
		font-size: 2.25rem;
		font-weight: 800;
		letter-spacing: -0.025em;
	}

	.lead {
		margin-bottom: 1.75rem;
		color: var(--pico-muted-color);
		font-size: 1.05rem;
		line-height: 1.7;
	}

	.source-link {
		display: inline-block;
		border-radius: 8px;
		background: var(--pico-primary);
		padding: 0.75rem 1rem;
		color: #fff;
		font-weight: 600;
		text-decoration: none;
	}

	.source-link:hover {
		background: var(--pico-primary-hover);
		color: #fff;
		text-decoration: none;
	}

	.next-steps {
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 12px;
		background: var(--pico-card-background-color);
		padding: 1.5rem;
	}

	.next-steps h2 {
		margin-bottom: 0.5rem;
		font-size: 1.125rem;
	}

	.next-steps p {
		color: var(--pico-muted-color);
		line-height: 1.65;
	}

	.docs-link {
		display: inline-block;
		margin-top: 0.5rem;
		font-weight: 600;
	}
</style>
