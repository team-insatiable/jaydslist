<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<header class="site-header">
	<nav>
		<div class="cta-group">
			<a href={resolve('/login')} class="nav-action">Sign in</a>
			<a href={resolve('/register')} class="cta-primary">Create account</a>
		</div>
	</nav>
</header>

<style>
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
		justify-content: flex-end;
		height: 56px;
		padding-inline: 1rem;
		max-width: 1100px;
		margin-inline: auto;
	}

	.cta-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.nav-action {
		background: none;
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 6px;
		padding: 0.4rem 0.9rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--pico-color);
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

	.cta-primary {
		background: var(--pico-primary);
		color: #fff;
		border-radius: 6px;
		padding: 0.4rem 0.9rem;
		font-size: 0.875rem;
		font-weight: 600;
		text-decoration: none;
		transition: background 0.15s;
	}

	.cta-primary:hover {
		background: var(--pico-primary-hover);
		color: #fff;
		text-decoration: none;
	}

	@media (max-width: 480px) {
		.nav-action,
		.cta-primary {
			padding: 0.35rem 0.6rem;
			font-size: 0.8rem;
		}
	}
</style>
