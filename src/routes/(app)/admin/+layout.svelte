<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	let { children } = $props();
	const sections = [
		{ href: '/admin/review' as const, label: 'Review inbox' },
		{ href: '/admin' as const, label: 'Reports' },
		{ href: '/admin/safety-cases' as const, label: 'Safety cases' },
		{ href: '/admin/users' as const, label: 'Users' },
		{ href: '/admin/vocabulary' as const, label: 'Vocabulary' },
		{ href: '/admin/safety-rules' as const, label: 'Content Safety rules' },
		{ href: '/admin/preservation' as const, label: 'Preservation' }
	];
</script>

<div class="admin-wrap">
	<p class="admin-label">Admin</p>
	<nav class="admin-nav" aria-label="Admin sections">
		{#each sections as section (section.href)}
			<a
				href={resolve(section.href)}
				aria-current={page.url.pathname === section.href ? 'page' : undefined}>{section.label}</a
			>
		{/each}
	</nav>
	<div class="admin-content">
		{@render children()}
	</div>
</div>

<style>
	.admin-wrap {
		max-width: 1100px;
		margin-inline: auto;
	}

	.admin-nav {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
		padding: 0 0 1rem;
		border-bottom: 1px solid var(--pico-muted-border-color);
		margin-bottom: 2rem;
	}

	.admin-label {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--pico-del-color);
		margin: 0 0 0.75rem;
	}

	.admin-nav a {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--pico-muted-color);
		text-decoration: none;
		padding: 0.5rem 0.75rem;
		border-radius: 0.5rem;
		white-space: nowrap;
	}

	.admin-nav a:hover,
	.admin-nav a[aria-current='page'] {
		color: var(--pico-color);
		background: var(--pico-card-background-color);
	}

	.admin-nav a[aria-current='page'] {
		box-shadow: inset 0 -2px 0 var(--pico-primary);
	}

	.admin-nav a:focus-visible {
		outline: 2px solid var(--pico-primary);
		outline-offset: 2px;
	}

	.admin-content :global(.admin-page) {
		max-width: 900px;
	}

	.admin-content :global(.admin-page-intro) {
		max-width: 65ch;
		color: var(--pico-muted-color);
		line-height: 1.55;
		margin-bottom: 1.5rem;
	}

	.admin-content :global(.admin-panel) {
		padding: clamp(1rem, 3vw, 1.5rem);
		margin-bottom: 1.5rem;
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 0.75rem;
		background: var(--pico-card-background-color);
	}

	.admin-content :global(.admin-panel h2),
	.admin-content :global(.admin-panel h3) {
		margin-bottom: 0.5rem;
	}

	.admin-content :global(.admin-panel form) {
		margin-bottom: 0;
	}

	.admin-content :global(.admin-panel label) {
		display: block;
		margin: 1rem 0 0.4rem;
	}

	.admin-content :global(.admin-panel button) {
		width: auto;
	}

	.admin-content :global(.admin-panel pre) {
		max-width: 100%;
		overflow-x: auto;
	}
</style>
