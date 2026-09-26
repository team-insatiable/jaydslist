<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	let { variant = 'public' }: { variant?: 'public' | 'app' } = $props();
</script>

<footer
	class="site-footer"
	class:app-footer={variant === 'app'}
	class:landing-footer={variant === 'public' && page.url.pathname === '/'}
>
	<small>
		© {new Date().getFullYear()}
		{page.data.instanceName} &mdash;
		<a href={resolve('/about')}>About</a> &mdash;
		<a href={resolve('/self-host')}>Self-host</a> &mdash;
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

	.landing-footer {
		border-top: 0;
		margin-top: 0;
	}

	.site-footer a {
		color: var(--pico-muted-color);
		text-decoration: none;
	}

	.site-footer a:hover {
		color: var(--pico-primary);
		text-decoration: underline;
	}

	.app-footer {
		padding-block: 1.5rem;
		margin-top: 0;
		display: none;
	}

	@media (min-width: 960px) {
		.app-footer {
			display: block;
		}
	}
</style>
