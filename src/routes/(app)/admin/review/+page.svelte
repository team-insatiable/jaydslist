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

<section>
	<h1>Content Safety review inbox</h1>
	<p>
		One submission creates one automated case. If several rules match, its highest-priority queue is
		shown here with every matching section.
	</p>
	<nav aria-label="Review views">
		{#each views as view (view.id)}
			<a
				href={resolve(`/admin/review?view=${view.id}`)}
				aria-current={data.view === view.id ? 'page' : undefined}>{view.label}</a
			>
		{/each}
	</nav>
	{#if data.entries.length === 0}<p>No pending items in this view.</p>{/if}
	{#each data.entries as entry (entry.id)}
		<article>
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
	nav {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}
</style>
