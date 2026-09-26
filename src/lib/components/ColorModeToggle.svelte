<script lang="ts">
	import { onMount } from 'svelte';

	type ColorScheme = 'light' | 'dark';
	let override = $state<ColorScheme | null>(null);
	let resolved = $state<ColorScheme>('light');
	let hydrated = $state(false);

	function systemScheme(): ColorScheme {
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}

	function apply(value: ColorScheme | null) {
		override = value;
		resolved = value ?? systemScheme();
		if (value) {
			document.documentElement.dataset.colorScheme = value;
			localStorage.setItem('jaydslist-color-scheme', value);
		} else {
			delete document.documentElement.dataset.colorScheme;
			localStorage.removeItem('jaydslist-color-scheme');
		}
	}

	onMount(() => {
		const saved = localStorage.getItem('jaydslist-color-scheme');
		apply(saved === 'light' || saved === 'dark' ? saved : null);
		hydrated = true;
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const syncSystem = () => {
			if (!override) resolved = systemScheme();
		};
		mediaQuery.addEventListener('change', syncSystem);
		return () => mediaQuery.removeEventListener('change', syncSystem);
	});

	function toggle() {
		apply(override ? null : resolved === 'dark' ? 'light' : 'dark');
	}
</script>

<button
	type="button"
	class="color-mode-toggle"
	onclick={toggle}
	aria-label={resolved === 'dark' ? 'Use light mode' : 'Use dark mode'}
	title={resolved === 'dark' ? 'Use light mode' : 'Use dark mode'}
	data-hydrated={hydrated ? 'true' : undefined}
>
	{#if resolved === 'dark'}
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"
			><circle cx="12" cy="12" r="4" /><path
				d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
			/></svg
		>
	{:else}
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"
			><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" /></svg
		>
	{/if}
</button>

<style>
	.color-mode-toggle {
		position: fixed;
		top: 0.75rem;
		right: 1rem;
		z-index: 110;
		width: 2.5rem;
		height: 2.5rem;
		padding: 0;
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 999px;
		background: var(--pico-card-background-color);
		color: var(--pico-color);
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
	}
	.color-mode-toggle:hover:not(:disabled) {
		border-color: var(--pico-primary);
		background: var(--pico-card-background-color);
		color: var(--pico-primary);
	}
	.color-mode-toggle svg {
		width: 1.1rem;
		height: 1.1rem;
	}
</style>
