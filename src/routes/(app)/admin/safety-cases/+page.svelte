<script lang="ts">
	import { resolve } from '$app/paths';
	let { data, form } = $props();
</script>

<section>
	<h1>Safety review cases</h1>
	<p>
		Held content stays hidden from other users until released. Review the captured submission and
		rule version before deciding.
	</p>
	<p>
		<a href={resolve('/admin/safety-cases')}>Pending</a> ·
		<a href={resolve('/admin/safety-cases?status=resolved')}>Resolved</a>
	</p>
	{#if form?.error}<p role="alert">{form.error}</p>{/if}
	{#if form?.success}<p role="status">
			Case {form.decision === 'release' ? 'released' : 'rejected'}.
		</p>{/if}
	{#if data.cases.length === 0}<p>No {data.status} cases.</p>{/if}
	{#each data.cases as safetyCase (safetyCase.id)}
		<article>
			<h2>{safetyCase.targetType} · {safetyCase.status}</h2>
			<p>Submitted {new Date(safetyCase.createdAt).toLocaleString()} · {safetyCase.reason}</p>
			<p>
				Rule revision: {safetyCase.ruleRevisionId ?? 'unavailable'} · Matched rules: {safetyCase.matchedRuleIds.join(
					', '
				) || 'none'}
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
