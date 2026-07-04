<script lang="ts">
	import '@picocss/pico/css/pico.classless.min.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;1,14..32,400&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

{@render children()}

<style>
	/* :root:not([data-theme]) matches Pico's own dark/light-mode selector
	   specificity — a plain :root here loses the cascade to Pico's built-in
	   color-scheme blocks and the override silently never applies. */
	:global(:root:not([data-theme])) {
		--pico-font-family-sans-serif: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
		--pico-font-size: 15px;
		--pico-primary: #2563eb;
		--pico-primary-hover: #1d4ed8;
		--pico-primary-focus: rgba(37, 99, 235, 0.25);
		--pico-primary-inverse: #fff;
	}

	@media (prefers-color-scheme: light) {
		:global(body) {
			background: #f0f2f5;
		}
	}
</style>
