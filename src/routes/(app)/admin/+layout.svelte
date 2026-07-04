<script lang="ts">
	import { resolve } from '$app/paths';
	let { children } = $props();
</script>

<div class="admin-wrap">
	<nav class="admin-nav">
		<span class="admin-label">Admin</span>
		<a href={resolve('/admin')}>Reports</a>
		<a href={resolve('/admin/users')}>Users</a>
		<a href={resolve('/admin/vocabulary')}>Vocabulary</a>
	</nav>
	<div class="admin-content">
		{@render children()}
	</div>
</div>

<style>
	.admin-wrap {
		max-width: 800px;
		margin-inline: auto;
	}

	.admin-nav {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.5rem 0 1rem;
		border-bottom: 1px solid var(--pico-muted-border-color);
		margin-bottom: 1.5rem;
	}

	.admin-label {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--pico-del-color);
		margin-right: 0.5rem;
	}

	.admin-nav a {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--pico-muted-color);
		text-decoration: none;
	}

	.admin-nav a:hover {
		color: var(--pico-color);
	}
</style>
