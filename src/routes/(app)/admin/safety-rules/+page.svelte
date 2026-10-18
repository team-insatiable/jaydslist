<script lang="ts">
	let { data, form } = $props();
	let rules = $state(JSON.stringify({ schemaVersion: 2, sections: [] }, null, 2));
	let reason = $state('');
	let activationReason = $state('');
	let importError = $state('');

	async function importRulesFile(event: Event) {
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		if (file.size > 50_000) {
			importError = 'Rule file must be 50 KB or smaller.';
			return;
		}
		try {
			rules = await file.text();
			importError = '';
		} catch {
			importError = 'Could not read the selected file.';
		}
	}
</script>

<section>
	<h1>Content Safety rules</h1>
	<p>
		Stage a revision, review it, then activate it. Older revisions remain available for rollback.
		These rules are separate from listing vocabulary. New submissions use the active revision;
		matches and scanner failures enter the Safety cases queue.
	</p>
	{#if form?.error}<p role="alert">{form.error}</p>{/if}
	{#if form?.success}<p role="status">Rule revision saved.</p>{/if}
	<p>
		Load your deployed <code>content/safety-rules.json</code> file or choose one from your device. Review
		it, then stage and activate it with reasons. Loading a file does not activate rules.
	</p>
	<button type="button" onclick={() => (rules = data.instanceRuleFile)}>
		Load deployed rules file
	</button>
	<label for="rules-file">Choose a rules JSON file</label>
	<input id="rules-file" type="file" accept=".json,application/json" onchange={importRulesFile} />
	{#if importError}<p role="alert">{importError}</p>{/if}
	<form method="POST" action="?/stage">
		<label for="rules-json">Rule JSON</label>
		<textarea id="rules-json" name="rules" bind:value={rules} rows="12" required></textarea>
		<p>
			Group rules into named sections with a review queue: urgent, solicitation, or general. Each
			rule needs an ID, label, intent, false positive risk, scope, and at least two terms in <code
				>all</code
			>, or one term in <code>all</code> plus alternatives in <code>any</code>. Optional
			<code>none</code> terms exclude a match.
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
