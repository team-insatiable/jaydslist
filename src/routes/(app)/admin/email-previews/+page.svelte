<script lang="ts">
	import { resolve } from '$app/paths';
	let { data } = $props();
</script>

<section class="admin-page email-previews">
	<h1>Email previews</h1>
	<p class="admin-page-intro">
		See how the currently deployed email templates render with example details. These previews do
		not send email. Links containing sample tokens are only examples.
	</p>
	<nav class="template-list" aria-label="Email templates">
		{#each data.examples as example (example.id)}
			<a
				href={resolve(`/admin/email-previews?template=${example.id}`)}
				aria-current={data.selected.id === example.id ? 'page' : undefined}>{example.label}</a
			>
		{/each}
	</nav>
	<div class="admin-panel">
		<h2>{data.selected.label}</h2>
		<p class="description">{data.selected.description}</p>
		<p class="subject"><strong>Subject</strong><span>{data.preview.subject}</span></p>
		<iframe
			title="{data.selected.label} email example"
			srcdoc={data.preview.html}
			sandbox=""
			loading="lazy"
		></iframe>
	</div>
</section>

<style>
	.template-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}

	.template-list a {
		padding: 0.5rem 0.9rem;
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 999px;
		color: var(--pico-muted-color);
		font-size: 0.9rem;
		font-weight: 600;
		text-decoration: none;
	}

	.template-list a:hover,
	.template-list a[aria-current='page'] {
		color: var(--pico-color);
		border-color: var(--pico-primary);
		background: var(--pico-card-background-color);
	}

	.template-list a:focus-visible {
		outline: 2px solid var(--pico-primary);
		outline-offset: 2px;
	}

	.description {
		color: var(--pico-muted-color);
	}

	.subject {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem 1rem;
		padding: 0.9rem 1rem;
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 0.5rem;
	}

	.subject strong {
		min-width: 4rem;
	}

	iframe {
		display: block;
		width: 100%;
		min-height: 500px;
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 0.5rem;
		background: white;
	}
</style>
