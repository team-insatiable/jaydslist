<script lang="ts">
	import MarketingHeader from '$lib/components/MarketingHeader.svelte';

	let { children } = $props();
</script>

<MarketingHeader />

{@render children()}
