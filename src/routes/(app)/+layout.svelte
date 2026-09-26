<script lang="ts">
	import BrandMark from '$lib/components/BrandMark.svelte';
	import { authClient } from '$lib/client/auth';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { invalidate } from '$app/navigation';
	import SiteFooter from '$lib/components/SiteFooter.svelte';

	let { children, data } = $props();

	// Poll unread count every 30s from any page so the inbox badge stays fresh
	$effect(() => {
		if (!browser || !data.user) return;
		const interval = setInterval(() => {
			if (!document.hidden) invalidate('app:inbox');
		}, 30000);
		return () => clearInterval(interval);
	});
	let menuOpen = $state(false);
	let settingsOpen = $state(false);

	function closeSettings() {
		settingsOpen = false;
	}

	$effect(() => {
		if (!browser || !data.user || !data.vapidPublicKey) return;

		async function registerPush() {
			try {
				const reg = await navigator.serviceWorker.register('/sw.js');
				const permission = await Notification.requestPermission();
				if (permission !== 'granted') return;

				const existing = await reg.pushManager.getSubscription();
				const sub =
					existing ??
					(await reg.pushManager.subscribe({
						userVisibleOnly: true,
						applicationServerKey: urlBase64ToUint8Array(data.vapidPublicKey)
					}));

				await fetch('/api/push/subscribe', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						endpoint: sub.endpoint,
						keys: {
							p256dh: arrayBufferToBase64url(sub.getKey('p256dh')!),
							auth: arrayBufferToBase64url(sub.getKey('auth')!)
						}
					})
				});
			} catch {
				// Push not supported or denied — silent fail
			}
		}

		registerPush();
	});

	function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
		const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
		const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
		const raw = atob(base64);
		const bytes = new Uint8Array(raw.length);
		for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
		return bytes;
	}

	function arrayBufferToBase64url(buf: ArrayBuffer): string {
		const bytes = new Uint8Array(buf);
		let bin = '';
		for (const b of bytes) bin += String.fromCharCode(b);
		return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
	}

	async function logout() {
		menuOpen = false;
		settingsOpen = false;
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

<!-- Desktop header -->
<header class="site-header">
	<nav>
		<a href={resolve('/browse')} class="logo" aria-label={data.instanceName}>
			<BrandMark size={40} />
			<span class="brand-wordmark">{data.instanceName}<span>{data.instanceTagline}</span></span>
		</a>
		<ul class="desktop-nav">
			<li>
				<a href={resolve('/browse')} class="nav-link" class:active={active('/browse')}>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg
					>
					Browse
				</a>
			</li>
			<li>
				<a href={resolve('/post')} class="nav-link" class:active={active('/post')}>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" /></svg
					>
					New listing
				</a>
			</li>
			<li>
				<a href={resolve('/inbox')} class="nav-link nav-link-inbox" class:active={active('/inbox')}>
					<span class="nav-icon-wrap">
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg
						>
						{#if data.unreadCount > 0}<span class="badge">{data.unreadCount}</span>{/if}
					</span>
					Inbox
				</a>
			</li>
			<li>
				<a href={resolve('/my-listings')} class="nav-link" class:active={active('/my-listings')}>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><path
							d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
						/><rect x="9" y="3" width="6" height="4" rx="1" /></svg
					>
					My listings
				</a>
			</li>
			<li class="settings-wrap">
				<button
					class="nav-link"
					class:active={settingsOpen || active('/profile') || active('/vault')}
					onclick={() => (settingsOpen = !settingsOpen)}
					aria-label="Settings"
				>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path
							d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
						/><circle cx="12" cy="12" r="3" />
					</svg>
					Settings
				</button>

				{#if settingsOpen}
					<div
						class="settings-overlay"
						role="button"
						tabindex="-1"
						aria-label="Close settings"
						onclick={closeSettings}
						onkeydown={(e) => e.key === 'Enter' && closeSettings()}
					></div>
					<div class="settings-dropdown">
						<a href={resolve('/profile')} class="settings-item" onclick={closeSettings}>
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle
									cx="12"
									cy="7"
									r="4"
								/></svg
							>
							Profile
						</a>
						<a href={resolve('/vault')} class="settings-item" onclick={closeSettings}>
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								><rect x="3" y="3" width="18" height="18" rx="2" /><circle
									cx="9"
									cy="9"
									r="2"
								/><path d="m21 15-5-5L5 21" /></svg
							>
							Photo vault
						</a>
						<div class="settings-divider"></div>
						<button class="settings-item settings-signout" onclick={logout}>
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline
									points="16 17 21 12 16 7"
								/><line x1="21" y1="12" x2="9" y2="12" /></svg
							>
							Sign out
						</button>
					</div>
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
	<div
		class="overlay"
		role="button"
		tabindex="-1"
		aria-label="Close menu"
		onclick={closeMenu}
		onkeydown={(e) => e.key === 'Enter' && closeMenu()}
	></div>
{/if}
<div class="drawer" class:open={menuOpen}>
	<nav class="drawer-nav">
		<a href={resolve('/post')} class="drawer-item" onclick={closeMenu}>
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" />
			</svg>
			Create listing
		</a>
		<a href={resolve('/my-listings')} class="drawer-item" onclick={closeMenu}>
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect
					x="9"
					y="3"
					width="6"
					height="4"
					rx="1"
				/>
			</svg>
			My listings
		</a>
		<a href={resolve('/vault')} class="drawer-item" onclick={closeMenu}>
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path
					d="m21 15-5-5L5 21"
				/>
			</svg>
			Photo vault
		</a>
		<a href={resolve('/inbox')} class="drawer-item" onclick={closeMenu}>
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
			</svg>
			Inbox
			{#if data.unreadCount > 0}<span class="badge">{data.unreadCount}</span>{/if}
		</a>
		<a href={resolve('/profile')} class="drawer-item" onclick={closeMenu}>
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path
					d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
				/><circle cx="12" cy="12" r="3" />
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
<nav class="bottom-nav" class:hidden={page.url.pathname.match(/^\/inbox\/.+/)}>
	<a href={resolve('/browse')} class="tab-item" class:active={active('/browse')}>
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg
		>
		<span>Browse</span>
	</a>
	<a href={resolve('/post')} class="tab-item" class:active={active('/post')}>
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" /></svg
		>
		<span>New</span>
	</a>
	<a href={resolve('/inbox')} class="tab-item" class:active={active('/inbox')}>
		<span class="tab-icon-wrap">
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg
			>
			{#if data.unreadCount > 0}<span class="badge">{data.unreadCount}</span>{/if}
		</span>
		<span>Inbox</span>
	</a>
	<a href={resolve('/profile')} class="tab-item" class:active={active('/profile')}>
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg
		>
		<span>Profile</span>
	</a>
</nav>

<SiteFooter variant="app" />

<style>
	.brand-wordmark {
		font-size: 1.4rem;
		font-weight: 800;
		letter-spacing: -0.05em;
		line-height: 1.1;
	}
	.brand-wordmark span {
		display: block;
		font-size: 0.55rem;
		font-weight: 500;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--pico-muted-color);
		margin-top: 0.3rem;
	}
	:global(body) {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	:global(main) {
		flex: 1;
		width: 100%;
		max-width: 1240px;
		margin-inline: auto;
		padding: 1.5rem 1rem;
		padding-bottom: calc(1.5rem + 64px + env(safe-area-inset-bottom, 8px));
	}

	@media (min-width: 960px) {
		:global(main) {
			padding: 2rem 1.5rem;
		}
	}

	/* ── Header ── */
	.site-header {
		position: sticky;
		top: 0;
		z-index: 100;
		background: var(--pico-card-background-color);
		border-bottom: 1px solid var(--pico-muted-border-color);
	}

	.site-header nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 64px;
		padding-inline: 1rem;
		max-width: 1240px;
		margin-inline: auto;
	}

	.logo {
		gap: 0.6rem;
		text-decoration: none !important;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		color: var(--pico-primary);
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

	.nav-link {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--pico-muted-color);
		text-decoration: none;
		padding: 0.35rem 0.5rem;
		border-radius: 8px;
		transition:
			color 0.15s,
			background 0.15s;
		min-width: 52px;
	}

	.nav-link svg {
		width: 20px;
		height: 20px;
		stroke-width: 1.75;
		flex-shrink: 0;
	}

	.nav-link:hover {
		color: var(--pico-color);
		background: var(--pico-muted-background-color);
		text-decoration: none;
	}

	.nav-link.active {
		color: var(--pico-primary);
		background: color-mix(in srgb, var(--pico-primary) 8%, transparent);
	}

	.nav-icon-wrap {
		position: relative;
		display: inline-flex;
	}

	.nav-link-inbox .badge {
		position: absolute;
		top: -4px;
		right: -6px;
		min-width: 15px;
		height: 15px;
		font-size: 0.6rem;
	}

	/* Settings dropdown */
	.settings-wrap {
		position: relative;
	}

	.settings-wrap > button.nav-link {
		font-family: inherit;
		cursor: pointer;
		border: none;
		background: none;
	}

	.settings-overlay {
		position: fixed;
		inset: 0;
		z-index: 150;
		background: transparent !important;
	}

	.settings-dropdown {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		min-width: 180px;
		background: var(--pico-card-background-color);
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 10px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
		z-index: 151;
		padding: 0.375rem;
		display: flex;
		flex-direction: column;
	}

	.settings-item {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.6rem 0.75rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--pico-color);
		text-decoration: none;
		border-radius: 7px;
		background: none;
		border: none;
		cursor: pointer;
		font-family: inherit;
		text-align: left;
		width: 100%;
		transition: background 0.1s;
	}

	.settings-item:hover {
		background: var(--pico-muted-background-color);
		text-decoration: none;
		color: var(--pico-color);
	}

	.settings-item svg {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
		color: var(--pico-muted-color);
	}

	.settings-divider {
		height: 1px;
		background: var(--pico-muted-border-color);
		margin: 0.25rem 0;
	}

	.settings-signout {
		color: var(--pico-del-color);
	}

	.settings-signout:hover {
		background: color-mix(in srgb, var(--pico-del-color) 8%, transparent);
		color: var(--pico-del-color);
	}

	.settings-signout svg {
		color: var(--pico-del-color);
	}

	@media (min-width: 960px) {
		.desktop-nav {
			display: flex;
		}
		.hamburger {
			display: none !important;
		}
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
		background: none !important;
		border: none !important;
		box-shadow: none !important;
		cursor: pointer;
		border-radius: 6px;
		color: var(--pico-muted-color) !important;
	}

	.hamburger:hover {
		background: var(--pico-muted-background-color) !important;
	}

	.hamburger span {
		display: block;
		height: 2px;
		width: 100%;
		background: currentColor;
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
		top: 64px;
		right: 0;
		left: auto;
		width: min(280px, 80vw);
		background: var(--pico-background-color);
		z-index: 201;
		display: flex;
		flex-direction: column;
		max-height: 0;
		overflow: hidden;
		transition:
			max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1),
			box-shadow 0.25s;
	}

	.drawer.open {
		max-height: 480px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
		border-bottom: 1px solid var(--pico-muted-border-color);
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

	.bottom-nav.hidden {
		display: none;
	}

	@media (min-width: 960px) {
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
</style>
