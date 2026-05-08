<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { authClient } from '$lib/client/auth';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	let { children, data } = $props();

	async function logout() {
		await authClient.signOut();
		window.location.href = resolve('/login');
	}

	function active(match: string) {
		return page.url.pathname === match || page.url.pathname.startsWith(match + '/');
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;1,14..32,400&display=swap" rel="stylesheet" />
</svelte:head>

<!-- Desktop header -->
<header class="site-header">
	<nav>
		<a href={resolve('/browse')} class="logo">Jaydslist</a>
		<ul class="desktop-nav">
			<li><a href={resolve('/browse')}>Browse</a></li>
			<li><a href={resolve('/post')}>Post an ad</a></li>
			<li><a href={resolve('/inbox')}>Inbox</a></li>
			<li><a href={resolve('/profile')}>Profile</a></li>
			<li>
				{#if data.user}
					<button class="nav-action" onclick={logout}>Sign out</button>
				{:else}
					<a href={resolve('/login')} class="nav-action">Sign in</a>
				{/if}
			</li>
		</ul>
		<!-- Mobile: sign in/out in top bar -->
		<div class="mobile-header-action">
			{#if data.user}
				<button class="mobile-text-action" onclick={logout}>Sign out</button>
			{:else}
				<a href={resolve('/login')} class="mobile-text-action">Sign in</a>
			{/if}
		</div>
	</nav>
</header>

<main>
	{@render children()}
</main>

<!-- Mobile bottom tab bar -->
<nav class="bottom-nav">
	<a href={resolve('/browse')} class="tab-item" class:active={active('/browse')}>
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
		<span>Browse</span>
	</a>
	<a href={resolve('/post')} class="tab-item" class:active={active('/post')}>
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
		<span>Post</span>
	</a>
	<a href={resolve('/inbox')} class="tab-item" class:active={active('/inbox')}>
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
		<span>Inbox</span>
	</a>
	<a href={resolve('/profile')} class="tab-item" class:active={active('/profile')}>
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
		<span>Profile</span>
	</a>
</nav>

<footer class="site-footer">
	<small>© {new Date().getFullYear()} Jaydslist &mdash; <a href="/about">About</a> &mdash; <a href="/rules">Rules</a></small>
</footer>

<style>
	:global(:root) {
		--pico-font-family-sans-serif: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
		--pico-font-size: 15px;
		--pico-primary: #2563eb;
		--pico-primary-hover: #1d4ed8;
		--pico-primary-focus: rgba(37, 99, 235, 0.25);
		--pico-primary-inverse: #fff;
	}

	:global(body) {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	:global(main) {
		flex: 1;
		width: 100%;
		max-width: 1100px;
		margin-inline: auto;
		padding: 1.5rem 1rem;
		/* space for bottom nav on mobile */
		padding-bottom: calc(1.5rem + 64px + env(safe-area-inset-bottom, 8px));
	}

	@media (min-width: 768px) {
		:global(main) {
			padding: 2rem 1.5rem;
		}
	}

	/* ── Header ── */
	.site-header {
		position: sticky;
		top: 0;
		z-index: 100;
		background: var(--pico-background-color);
		border-bottom: 1px solid var(--pico-muted-border-color);
	}

	.site-header nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 56px;
		padding-inline: 1rem;
		max-width: 1100px;
		margin-inline: auto;
	}

	.logo {
		font-size: 1.2rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: var(--pico-color) !important;
		text-decoration: none !important;
		flex-shrink: 0;
	}

	.logo:hover {
		color: var(--pico-primary) !important;
	}

	/* Desktop nav — hidden on mobile */
	.desktop-nav {
		display: none;
		list-style: none;
		margin: 0;
		padding: 0;
		gap: 1.5rem;
		align-items: center;
	}

	.desktop-nav li {
		padding: 0;
		margin: 0;
	}

	.desktop-nav a {
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--pico-muted-color);
		text-decoration: none;
	}

	.desktop-nav a:hover {
		color: var(--pico-color);
	}

	.mobile-header-action {
		display: flex;
		align-items: center;
	}

	@media (min-width: 768px) {
		.desktop-nav {
			display: flex;
		}

		.mobile-header-action {
			display: none;
		}
	}

	.nav-action {
		background: none;
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 6px;
		padding: 0.35rem 0.9rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--pico-color);
		cursor: pointer;
		text-decoration: none;
		transition: border-color 0.15s, color 0.15s;
	}

	.nav-action:hover {
		border-color: var(--pico-primary);
		color: var(--pico-primary);
		text-decoration: none;
	}

	.mobile-text-action {
		background: none;
		border: none;
		padding: 0;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--pico-primary);
		cursor: pointer;
		text-decoration: none;
	}

	/* ── Bottom tab bar — mobile only ── */
	.bottom-nav {
		display: flex;
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: var(--pico-background-color);
		border-top: 1px solid var(--pico-muted-border-color);
		z-index: 100;
		padding-bottom: env(safe-area-inset-bottom, 8px);
	}

	@media (min-width: 768px) {
		.bottom-nav {
			display: none;
		}
	}

	.tab-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.2rem;
		color: var(--pico-muted-color);
		text-decoration: none;
		font-size: 0.65rem;
		font-weight: 500;
		min-height: 56px;
		padding-top: 0.5rem;
	}

	.tab-item :global(svg) {
		width: 22px;
		height: 22px;
		stroke-width: 1.75;
	}

	.tab-item.active {
		color: var(--pico-primary);
	}

	.tab-item:hover {
		color: var(--pico-color);
		text-decoration: none;
	}

	/* ── Footer — hidden on mobile ── */
	.site-footer {
		padding-block: 1.5rem;
		border-top: 1px solid var(--pico-muted-border-color);
		text-align: center;
		color: var(--pico-muted-color);
		display: none;
	}

	@media (min-width: 768px) {
		.site-footer {
			display: block;
		}
	}
</style>
