<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { authClient } from '$lib/client/auth';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	let { children, data } = $props();
	let menuOpen = $state(false);

	async function logout() {
		menuOpen = false;
		await authClient.signOut();
		window.location.href = resolve('/login');
	}

	function active(match: string) {
		return page.url.pathname === match || page.url.pathname.startsWith(match + '/');
	}

	function closeMenu() {
		menuOpen = false;
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
			<li><a href={resolve('/post')}>New listing</a></li>
			<li>
				<a href={resolve('/inbox')} class="inbox-link">
					Inbox
					{#if data.unreadCount > 0}<span class="badge">{data.unreadCount}</span>{/if}
				</a>
			</li>
			<li><a href={resolve('/profile')}>Profile</a></li>
			<li>
				{#if data.user}
					<button class="nav-action" onclick={logout}>Sign out</button>
				{:else}
					<a href={resolve('/login')} class="nav-action">Sign in</a>
				{/if}
			</li>
		</ul>

		<!-- Mobile: hamburger -->
		<button class="hamburger" onclick={() => (menuOpen = !menuOpen)} aria-label="Menu">
			<span></span>
			<span></span>
			<span></span>
		</button>
	</nav>
</header>

<!-- Mobile flyout drawer -->
{#if menuOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="overlay" onclick={closeMenu}></div>
{/if}
<div class="drawer" class:open={menuOpen}>
	<nav class="drawer-nav">
		<a href={resolve('/post')} class="drawer-item" onclick={closeMenu}>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>
			</svg>
			Create listing
		</a>
		<a href={resolve('/my-listings')} class="drawer-item" onclick={closeMenu}>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/>
			</svg>
			Manage posts
		</a>
		<a href={resolve('/inbox')} class="drawer-item" onclick={closeMenu}>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
			</svg>
			Inbox
			{#if data.unreadCount > 0}<span class="badge">{data.unreadCount}</span>{/if}
		</a>
		<a href={resolve('/profile')} class="drawer-item" onclick={closeMenu}>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>
			</svg>
			Settings
		</a>
	</nav>

	<div class="drawer-footer">
		{#if data.user}
			<button class="drawer-signout" onclick={logout}>Sign out</button>
		{:else}
			<a href={resolve('/login')} class="drawer-signin" onclick={closeMenu}>Sign in</a>
		{/if}
	</div>
</div>

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
		<span>New</span>
	</a>
	<a href={resolve('/inbox')} class="tab-item" class:active={active('/inbox')}>
		<span class="tab-icon-wrap">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
			{#if data.unreadCount > 0}<span class="badge">{data.unreadCount}</span>{/if}
		</span>
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

	@media (min-width: 768px) {
		.desktop-nav {
			display: flex;
		}
		.hamburger {
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

	/* ── Hamburger button ── */
	.hamburger {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 5px;
		width: 36px;
		height: 36px;
		padding: 6px;
		background: none;
		border: none;
		cursor: pointer;
		border-radius: 6px;
	}

	.hamburger:hover {
		background: var(--pico-muted-background-color);
	}

	.hamburger span {
		display: block;
		height: 2px;
		width: 100%;
		background: var(--pico-color);
		border-radius: 2px;
	}

	/* ── Drawer overlay ── */
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.45);
		z-index: 200;
	}

	/* ── Drawer ── */
	.drawer {
		position: fixed;
		top: 56px;
		right: 0;
		left: auto;
		width: min(280px, 80vw);
		background: var(--pico-background-color);
		z-index: 201;
		display: flex;
		flex-direction: column;
		max-height: 0;
		overflow: hidden;
		transition: max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1),
		            box-shadow 0.25s;
	}

	.drawer.open {
		max-height: 480px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
		border-bottom: 1px solid var(--pico-muted-border-color);
	}

	.drawer-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--pico-muted-border-color);
		height: 56px;
	}

	.drawer-logo {
		font-size: 1.1rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: var(--pico-primary);
	}

	.drawer-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		background: none;
		border: none;
		cursor: pointer;
		color: var(--pico-muted-color);
		border-radius: 6px;
	}

	.drawer-close:hover {
		background: var(--pico-muted-background-color);
		color: var(--pico-color);
	}

	.drawer-close svg {
		width: 18px;
		height: 18px;
	}

	.drawer-nav {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 0.75rem 0;
		overflow-y: auto;
	}

	.drawer-item {
		display: flex;
		align-items: center;
		gap: 0.875rem;
		padding: 0.875rem 1.25rem;
		font-size: 1rem;
		font-weight: 500;
		color: var(--pico-color);
		text-decoration: none;
		transition: background 0.1s;
	}

	.drawer-item:hover {
		background: var(--pico-muted-background-color);
		color: var(--pico-primary);
		text-decoration: none;
	}

	.drawer-item svg {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
		color: var(--pico-muted-color);
	}

	.drawer-item:hover svg {
		color: var(--pico-primary);
	}

	.drawer-footer {
		padding: 1rem 1.25rem;
		border-top: 1px solid var(--pico-muted-border-color);
	}

	.drawer-signout {
		width: 100%;
		padding: 0.7rem;
		background: none;
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--pico-muted-color);
		cursor: pointer;
		text-align: center;
	}

	.drawer-signout:hover {
		border-color: var(--pico-del-color);
		color: var(--pico-del-color);
	}

	.drawer-signin {
		display: block;
		width: 100%;
		padding: 0.7rem;
		background: var(--pico-primary);
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 600;
		color: #fff;
		text-align: center;
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

	/* ── Unread badge ── */
	.badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 18px;
		height: 18px;
		padding: 0 4px;
		background: var(--pico-primary);
		color: #fff;
		border-radius: 999px;
		font-size: 0.65rem;
		font-weight: 700;
		line-height: 1;
	}

	.inbox-link {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}

	.tab-icon-wrap {
		position: relative;
		display: inline-flex;
	}

	.tab-icon-wrap .badge {
		position: absolute;
		top: -4px;
		right: -6px;
		min-width: 15px;
		height: 15px;
		font-size: 0.6rem;
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
