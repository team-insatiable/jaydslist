<script lang="ts">
	import { onMount } from 'svelte';

	type ColorScheme = 'light' | 'dark';
	type ColorMode = ColorScheme | 'system';

	let colorMode = $state<ColorMode>('system');
	let colorScheme = $state<ColorScheme>('light');
	let menuOpen = $state(false);

	function systemColorScheme(): ColorScheme {
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}

	function applyColorMode() {
		if (colorMode === 'system') {
			delete document.documentElement.dataset.colorScheme;
			localStorage.removeItem('jaydslist-color-scheme');
			colorScheme = systemColorScheme();
			return;
		}

		colorScheme = colorMode;
		document.documentElement.dataset.colorScheme = colorMode;
		localStorage.setItem('jaydslist-color-scheme', colorMode);
	}

	onMount(() => {
		const saved = localStorage.getItem('jaydslist-color-scheme');
		colorMode = saved === 'light' || saved === 'dark' ? saved : 'system';
		applyColorMode();

		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const syncSystemMode = () => {
			if (colorMode === 'system') colorScheme = systemColorScheme();
		};
		mediaQuery.addEventListener('change', syncSystemMode);
		return () => mediaQuery.removeEventListener('change', syncSystemMode);
	});

	function selectColorMode(mode: ColorMode) {
		colorMode = mode;
		applyColorMode();
		menuOpen = false;
	}

	function toggleMenu() {
		menuOpen = !menuOpen;
	}
</script>

<div class="color-mode-control">
	<button
		type="button"
		class="color-mode-toggle"
		onclick={toggleMenu}
		aria-expanded={menuOpen}
		aria-haspopup="menu"
		aria-label="Choose color mode"
	>
		{#if colorScheme === 'dark'}
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				aria-hidden="true"
			>
				<circle cx="12" cy="12" r="4" />
				<path
					d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
				/>
			</svg>
		{:else}
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				aria-hidden="true"
			>
				<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
			</svg>
		{/if}
		<span>{colorMode === 'system' ? 'System' : colorMode === 'dark' ? 'Dark' : 'Light'}</span>
	</button>

	{#if menuOpen}
		<div class="color-mode-menu" role="menu" aria-label="Color mode">
			<button
				type="button"
				role="menuitemradio"
				aria-checked={colorMode === 'system'}
				onclick={() => selectColorMode('system')}>System default</button
			>
			<button
				type="button"
				role="menuitemradio"
				aria-checked={colorMode === 'light'}
				onclick={() => selectColorMode('light')}>Light</button
			>
			<button
				type="button"
				role="menuitemradio"
				aria-checked={colorMode === 'dark'}
				onclick={() => selectColorMode('dark')}>Dark</button
			>
		</div>
	{/if}
</div>

<style>
	.color-mode-control {
		position: fixed;
		top: 0.75rem;
		right: 1rem;
		z-index: 110;
	}

	.color-mode-toggle {
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 999px;
		padding: 0.45rem 0.7rem;
		background: var(--pico-card-background-color);
		color: var(--pico-color);
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
		font-size: 0.8125rem;
	}

	.color-mode-toggle:hover:not(:disabled) {
		border-color: var(--pico-primary);
		background: var(--pico-card-background-color);
		color: var(--pico-primary);
	}

	.color-mode-toggle svg {
		width: 1rem;
		height: 1rem;
	}

	.color-mode-menu {
		position: absolute;
		top: calc(100% + 0.5rem);
		right: 0;
		width: 9.5rem;
		padding: 0.25rem;
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 10px;
		background: var(--pico-card-background-color);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
	}

	.color-mode-menu button {
		display: flex;
		width: 100%;
		justify-content: flex-start;
		border: 0;
		border-radius: 7px;
		padding: 0.5rem 0.6rem;
		background: transparent;
		color: var(--pico-color);
		font-size: 0.8125rem;
	}

	.color-mode-menu button[aria-checked='true'] {
		background: color-mix(in srgb, var(--pico-primary) 14%, transparent);
		color: var(--pico-primary);
		font-weight: 600;
	}

	.color-mode-menu button:hover:not(:disabled) {
		border-color: transparent;
		background: var(--pico-muted-background-color);
		color: var(--pico-color);
	}

	@media (max-width: 480px) {
		.color-mode-toggle span {
			position: absolute;
			width: 1px;
			height: 1px;
			padding: 0;
			margin: -1px;
			overflow: hidden;
			clip: rect(0, 0, 0, 0);
			white-space: nowrap;
			border: 0;
		}

		.color-mode-toggle {
			padding: 0.6rem;
		}
	}
</style>
