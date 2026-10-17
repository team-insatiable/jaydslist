<script lang="ts">
	let { data, form } = $props();
	let rules = $state('[]');
	let reason = $state('');
	let activationReason = $state('');
</script>

<section>
	<h1>Safety screening rules</h1>
	<p>
		Stage a revision, review it, then activate it. Older revisions remain available for rollback.
		These rules are separate from listing vocabulary. Screening and delivery holds are not enabled
		yet.
	</p>
	{#if form?.error}<p role="alert">{form.error}</p>{/if}
	{#if form?.success}<p role="status">Rule revision saved.</p>{/if}
	<form method="POST" action="?/stage">
		<label for="rules-json">Rule JSON</label>
		<textarea id="rules-json" name="rules" bind:value={rules} rows="12" required></textarea>
		<p>
			Each rule needs an ID, label, intent, known false positive risk, scope (message, listing, or
			both), and two or more terms in <code>all</code>. Use <code>falsePositiveRisk</code> for the
			risk field. Optional <code>none</code> terms exclude a match.
		</p>
		<label for="stage-reason">Change reason</label>
		<input id="stage-reason" name="reason" bind:value={reason} required maxlength="500" />
		<button type="submit">Stage revision</button>
	</form>
	<h2>Revisions</h2>
	{#if data.revisions.length === 0}
		<p>No revisions staged yet. No safety rule set is active.</p>
	{:else}
		{#each data.revisions as revision (revision.id)}
			<article>
				<h3>
					Revision {revision.version}{revision.id === data.activeRevisionId ? ' · Active' : ''}
				</h3>
				<p>{revision.reason} · {new Date(revision.createdAt).toLocaleString()}</p>
				<pre>{revision.rulesJson}</pre>
				{#if revision.id !== data.activeRevisionId}
					<form method="POST" action="?/activate">
						<input type="hidden" name="revisionId" value={revision.id} />
						<label for="activate-{revision.id}">Activation reason</label>
						<input
							id="activate-{revision.id}"
							name="reason"
							bind:value={activationReason}
							required
							maxlength="500"
						/>
						<button type="submit">Activate revision {revision.version}</button>
					</form>
				{/if}
			</article>
		{/each}
	{/if}
	<h2>Change history</h2>
	{#each data.history as entry (entry.id)}
		<p>
			{entry.actionType} · {entry.actorId} · {new Date(entry.createdAt).toLocaleString()} · {entry.reason}
		</p>
	{/each}
</section>
