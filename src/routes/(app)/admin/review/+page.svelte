<script lang="ts">
	import { resolve } from '$app/paths';
	let { data } = $props();
	const views = [
		{ id: 'all', label: 'All' },
		{ id: 'urgent', label: 'Urgent safety' },
		{ id: 'solicitation', label: 'Solicitation' },
		{ id: 'general', label: 'General safety' },
		{ id: 'system', label: 'System attention' },
		{ id: 'reports', label: 'User reports' }
	];
</script>

<section class="review-inbox">
	<header class="review-header">
		<h1>Content Safety review inbox</h1>
		<p>
			Each submission creates one case. When several rules match, the case appears in its
			highest-priority queue with all matching sections listed.
		</p>
	</header>
	<nav class="review-views" aria-label="Review views">
		{#each views as view (view.id)}
			<a
				href={resolve(`/admin/review?view=${view.id}`)}
				aria-current={data.view === view.id ? 'page' : undefined}>{view.label}</a
			>
		{/each}
	</nav>
	{#if data.entries.length === 0}
		<p class="empty-state">No pending items in this view.</p>
	{/if}
	{#each data.entries as entry (entry.id)}
		<article class="review-entry">
			<h2>{entry.queue} · {entry.targetType}</h2>
			<p>{entry.source} · {new Date(entry.createdAt).toLocaleString()}</p>
			<p>{entry.sections.join(', ') || entry.reason}</p>
			<a
				href={entry.source === 'user report'
					? resolve(`/admin#report-${entry.id}`)
					: resolve(`/admin/safety-cases?case=${entry.id}`)}>Review item</a
			>
		</article>
	{/each}
</section>

<style>
	.review-inbox {
		max-width: 900px;
	}

	.review-header {
		margin-bottom: 1.5rem;
	}

	.review-header h1 {
		margin-bottom: 0.6rem;
	}

	.review-header p {
		max-width: 65ch;
		margin-bottom: 0;
		color: var(--pico-muted-color);
		line-height: 1.55;
	}

	.review-views {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1.75rem;
	}

	.review-views a {
		display: inline-flex;
		align-items: center;
		min-height: 2.5rem;
		padding: 0.45rem 0.9rem;
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 999px;
		color: var(--pico-muted-color);
		font-size: 0.9rem;
		font-weight: 600;
		text-decoration: none;
	}

	.review-views a:hover,
	.review-views a[aria-current='page'] {
		color: var(--pico-color);
		border-color: var(--pico-primary);
		background: var(--pico-card-background-color);
	}

	.review-views a:focus-visible {
		outline: 2px solid var(--pico-primary);
		outline-offset: 2px;
	}

	.empty-state,
	.review-entry {
		padding: 1.5rem;
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 0.75rem;
		background: var(--pico-card-background-color);
	}

	.empty-state {
		color: var(--pico-muted-color);
		text-align: center;
	}

	.review-entry + .review-entry {
		margin-top: 1rem;
	}
</style>
