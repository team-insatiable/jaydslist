<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import MarketingHeader from '$lib/components/MarketingHeader.svelte';

	let { children } = $props();

	const instanceName = $derived(
		(page.data as { instanceName?: string }).instanceName ?? 'Jaydslist'
	);
</script>

<MarketingHeader />

{@render children()}

<footer class="site-footer">
	<small>
		© {new Date().getFullYear()}
		{instanceName} &mdash;
		<a href={resolve('/about')}>About</a> &mdash;
		<a href={resolve('/rules')}>Rules</a> &mdash;
		<a href={resolve('/terms')}>Terms</a> &mdash;
		<a href={resolve('/privacy')}>Privacy</a>
	</small>
</footer>

<style>
	.site-footer {
		text-align: center;
		padding: 2rem 1.5rem;
		color: var(--pico-muted-color);
		border-top: 1px solid var(--pico-muted-border-color);
		margin-top: 2rem;
	}

	.site-footer a {
		color: var(--pico-muted-color);
		text-decoration: none;
	}

	.site-footer a:hover {
		color: var(--pico-primary);
	}
</style>
