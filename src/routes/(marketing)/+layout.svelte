<script lang="ts">
	import { page } from '$app/state';
	import MarketingHeader from '$lib/components/MarketingHeader.svelte';
	import ColorModeToggle from '$lib/components/ColorModeToggle.svelte';
	import SiteFooter from '$lib/components/SiteFooter.svelte';

	let { children } = $props();
</script>

<MarketingHeader />

{#if page.url.pathname === '/'}
	<ColorModeToggle />
{/if}

{@render children()}

<SiteFooter />
