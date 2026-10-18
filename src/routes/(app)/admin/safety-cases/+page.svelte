<script lang="ts">
	import { resolve } from '$app/paths';
	let { data, form } = $props();
</script>

<section class="admin-page cases-page">
	<h1>Content Safety cases</h1>
	<p class="admin-page-intro">
		Held content stays hidden from other users until released. Review the captured submission and
		rule version before deciding.
	</p>
	<nav class="case-views" aria-label="Case status">
		<a
			href={resolve('/admin/safety-cases')}
			aria-current={data.status === 'pending' ? 'page' : undefined}>Pending</a
		>
		<a
			href={resolve('/admin/safety-cases?status=resolved')}
			aria-current={data.status === 'resolved' ? 'page' : undefined}>Resolved</a
		>
	</nav>
	{#if form?.error}<p role="alert">{form.error}</p>{/if}
	{#if form?.success}<p role="status">
			Case {form.decision === 'release' ? 'released' : 'rejected'}.
		</p>{/if}
	{#if data.cases.length === 0}<p class="admin-panel">No {data.status} cases.</p>{/if}
	{#each data.cases as safetyCase (safetyCase.id)}
		<article class="admin-panel">
			<h2>{safetyCase.queue} · {safetyCase.targetType} · {safetyCase.status}</h2>
			<p>Submitted {new Date(safetyCase.createdAt).toLocaleString()} · {safetyCase.reason}</p>
			<p>
				Sections: {safetyCase.matchedSections.join(', ') || 'none'} · Rule revision: {safetyCase.ruleRevisionId ??
					'unavailable'} · Matched rules: {safetyCase.matchedRuleIds.join(', ') || 'none'}
			</p>
			<p>Submitter: {safetyCase.submitterId} · Target: {safetyCase.targetId}</p>
			<p>
				<a href={resolve(`/admin/preservation?type=safety_case&id=${safetyCase.id}`)}
					>Manage preservation hold</a
				>
			</p>
			{#if safetyCase.evidence.subject}<strong>{safetyCase.evidence.subject}</strong>{/if}
			<pre>{safetyCase.evidence.body ?? '(media only)'}</pre>
			{#if safetyCase.evidence.cfImageId}<p>
					Image reference: {safetyCase.evidence.cfImageId}
				</p>{/if}
			{#if safetyCase.evidence.albumId}<p>Album reference: {safetyCase.evidence.albumId}</p>{/if}
			<p>
				Scan: {safetyCase.scan?.outcome ?? 'unknown'} · {safetyCase.scan
					? new Date(safetyCase.scan.checkedAt).toLocaleString()
					: ''}
			</p>
			{#each safetyCase.actions as action (action.id)}
				<p>
					{action.actionType} by {action.actorId} at {new Date(action.createdAt).toLocaleString()}: {action.reason}
				</p>
			{/each}
			{#if safetyCase.status === 'pending'}
				<form method="POST" action="?/release">
					<input type="hidden" name="caseId" value={safetyCase.id} />
					<label for="release-{safetyCase.id}">Release reason</label>
					<textarea id="release-{safetyCase.id}" name="notes" required maxlength="1000"></textarea>
					<button type="submit">Release content</button>
				</form>
				<form method="POST" action="?/reject">
					<input type="hidden" name="caseId" value={safetyCase.id} />
					<label for="reject-{safetyCase.id}">Rejection reason</label>
					<textarea id="reject-{safetyCase.id}" name="notes" required maxlength="1000"></textarea>
					<button type="submit">Reject content</button>
				</form>
			{/if}
		</article>
	{/each}
</section>

<style>
	.case-views {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}

	.case-views a {
		padding: 0.5rem 0.9rem;
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 999px;
		text-decoration: none;
	}

	.case-views a[aria-current='page'] {
		border-color: var(--pico-primary);
		background: var(--pico-card-background-color);
	}
</style>
