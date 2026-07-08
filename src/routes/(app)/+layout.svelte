<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { authClient } from '$lib/client/auth';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { invalidate } from '$app/navigation';

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

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- Desktop header -->
<header class="site-header">
	<nav>
		<a href={resolve('/browse')} class="logo" aria-label="Jaydslist">
			<svg
				class="logo-img"
				viewBox="0 0 1024 1024"
				xmlns="http://www.w3.org/2000/svg"
				aria-hidden="true"
			>
				<rect width="1024" height="1024" rx="180" fill="currentColor" />
				<path
					fill="#F6F5F5"
					d="M438.581 273.823C474.776 273.984 511.263 277.35 545.425 290.917C672.598 341.375 712.401 500.863 666.16 620.4C643.85 678.075 605.291 716.638 549.125 741.191C531.968 748.032 514.23 752.242 496.053 755.3C466.814 760.22 436.743 758.566 407.138 758.526L321.043 758.503C325.64 754.78 331.742 750.104 335.907 746.061C352.164 730.282 365.924 710.929 373.72 689.615C384.377 660.478 383.471 632.859 383.339 602.453L383.035 546.33L383.138 418.123C383.149 406.412 383.172 394.4 383.027 382.786C382.76 361.497 383.766 342.399 397.359 324.954C408.65 310.462 421.156 306.908 438.599 304.786L438.581 273.823Z"
				/>
				<path
					fill="currentColor"
					d="M468.668 306.573C530.924 313.174 557.696 379.605 566.397 433.694C570.118 457.166 572.332 480.851 573.027 504.605C574.444 558.75 567.567 646.57 534.909 691.75C515.849 714.539 497.841 723.582 468.661 729.127C469.819 684.043 469.007 635.628 468.987 590.385L468.668 306.573Z"
				/>
				<path
					fill="#F6F5F5"
					d="M198.229 273.466L414.216 273.511C414.373 278.575 414.409 283.643 414.324 288.709C407.555 290.139 401.477 291.556 395.133 294.429C350.322 314.719 357.39 374.775 357.47 415.422L357.488 558.932L357.502 601.906C357.493 622.671 357.713 639.755 353.485 659.85C338.486 729.773 278.44 769.893 208.22 764.411C167.413 761.225 138.192 748.552 115.825 712.733C97.4125 680.579 102.225 627.03 133.676 604.231C147.913 593.91 162.15 590.141 179.576 592.739C194.942 595.03 208.523 601.972 218.164 614.355C231.358 634.778 232.99 660.106 217.996 680.152C208.787 693.829 181.589 694.885 180.725 713.992C179.301 744.317 222.39 744.003 238.814 729.777C259.98 711.443 259.217 677.752 259.268 652.191C259.296 638.301 259.388 624.5 259.423 610.659L259.556 483.704L259.463 399.486C259.491 362.911 265.491 309.736 220.398 296.076C213.1 293.865 205.892 293.637 198.333 293.125L198.229 273.466Z"
				/>
				<path
					fill="#F6F5F5"
					d="M596.492 273.733L725.422 273.643C751.035 273.666 777.843 273.069 803.325 273.684L803.407 293.069C786.399 294.603 769.188 299.313 757 311.734C736.452 332.674 739.489 365.063 739.499 391.582L739.495 467.519L739.522 732.505C767.174 732.76 798.616 726.984 822.308 712.482C851.286 694.744 873.761 666.105 885.435 634.302C891.377 618.112 895.837 597.984 899.897 581.064C906.082 581.08 912.268 581.057 918.453 580.997C918.396 616.858 916.984 652.281 915.955 688.125L913.646 758.038L586.609 758.209C595.222 751.831 605.104 746.495 613.513 739.861C752.694 630.052 747.797 379.432 593.929 284.501C587.701 280.658 581.093 277.412 574.589 274.135C581.891 274.065 589.192 273.931 596.492 273.733Z"
				/>
			</svg>
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

<footer class="site-footer">
	<small
		>© {new Date().getFullYear()} Jaydslist &mdash; <a href={resolve('/about')}>About</a> &mdash;
		<a href={resolve('/rules')}>Rules</a> &mdash;
		<a href={resolve('/terms')}>Terms</a> &mdash;
		<a href={resolve('/privacy')}>Privacy</a></small
	>
</footer>

<style>
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
		text-decoration: none !important;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		color: var(--pico-primary);
	}

	.logo-img {
		height: 40px;
		width: auto;
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
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		font-size: 0.65rem;
		font-weight: 500;
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
		transition:
			border-color 0.15s,
			color 0.15s;
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

	@media (min-width: 960px) {
		.site-footer {
			display: block;
		}
	}
</style>
