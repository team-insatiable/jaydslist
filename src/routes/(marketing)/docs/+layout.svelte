<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	let { children } = $props();
	const sections = [
		{ href: '/docs', label: 'Overview' },
		{ href: '/docs/quickstart', label: 'Quickstart' },
		{ href: '/docs/deploy-cloudflare', label: 'Deploy on Cloudflare' },
		{ href: '/docs/configuration', label: 'Configuration' },
		{ href: '/docs/email', label: 'Email delivery' }
	] as const;
</script>

<main class="docs-shell">
	<aside class="docs-nav" aria-label="Documentation navigation">
		<a class="docs-brand" href={resolve('/self-host')}>Self-hosting docs</a>
		<nav>
			{#each sections as section (section.href)}
				<a
					href={resolve(section.href)}
					aria-current={page.url.pathname === section.href ? 'page' : undefined}
				>
					{section.label}
				</a>
			{/each}
		</nav>
		<a class="source-link" href="https://github.com/team-insatiable/jaydslist"
			>View source on GitHub</a
		>
	</aside>

	<article class="docs-content">{@render children()}</article>
</main>

<style>
	.docs-shell {
		display: grid;
		grid-template-columns: 13rem minmax(0, 48rem);
		gap: 4rem;
		max-width: 70rem;
		margin: 0 auto;
		padding: 3rem 1.5rem 5rem;
	}
	.docs-nav {
		position: sticky;
		top: 1.5rem;
		height: max-content;
	}
	.docs-brand {
		display: block;
		margin-bottom: 1rem;
		color: var(--pico-color);
		font-weight: 700;
		text-decoration: none;
	}
	.docs-nav nav {
		display: grid;
		gap: 0.25rem;
	}
	.docs-nav nav a,
	.source-link {
		border-radius: 6px;
		padding: 0.4rem 0.5rem;
		color: var(--pico-muted-color);
		font-size: 0.9rem;
		text-decoration: none;
	}
	.docs-nav nav a[aria-current='page'] {
		background: color-mix(in srgb, var(--pico-primary) 12%, transparent);
		color: var(--pico-primary);
		font-weight: 600;
	}
	.source-link {
		display: inline-block;
		margin-top: 1.5rem;
		padding-left: 0;
	}
	.docs-content :global(h1) {
		margin-bottom: 0.75rem;
		font-size: clamp(2rem, 4vw, 2.75rem);
		letter-spacing: -0.03em;
	}
	.docs-content :global(h2) {
		margin-top: 2.5rem;
		padding-top: 0.25rem;
	}
	.docs-content :global(p),
	.docs-content :global(li) {
		line-height: 1.7;
	}
	.docs-content :global(pre) {
		overflow-x: auto;
		padding: 1rem;
		border-radius: 8px;
		background: var(--pico-code-background-color);
	}
	.docs-content :global(code) {
		white-space: pre-wrap;
	}
	.docs-content :global(table) {
		display: block;
		overflow-x: auto;
	}
	@media (max-width: 700px) {
		.docs-shell {
			display: block;
			padding-top: 1.5rem;
		}
		.docs-nav {
			position: static;
			margin-bottom: 2rem;
		}
		.docs-nav nav {
			display: flex;
			flex-wrap: wrap;
		}
		.source-link {
			margin-top: 0.75rem;
		}
	}
</style>
