<script lang="ts">
	import SafetyRuleReview from '$lib/components/admin/SafetyRuleReview.svelte';
	import { parseSafetyPolicy, type SafetyPolicy } from '$lib/content-safety/rules';
	let { data, form } = $props();
	let rules = $state(JSON.stringify({ schemaVersion: 2, sections: [] }, null, 2));
	let reason = $state('');
	let activationReason = $state('');
	let importError = $state('');
	let formatError = $state('');
	let draftPreview = $derived.by((): { policy: SafetyPolicy | null; error: string } => {
		try {
			return { policy: parseSafetyPolicy(rules), error: '' };
		} catch (cause) {
			return {
				policy: null,
				error: cause instanceof Error ? cause.message : 'Cannot preview rules'
			};
		}
	});

	function formatRules() {
		try {
			rules = JSON.stringify(JSON.parse(rules), null, 2);
			formatError = '';
		} catch {
			formatError = 'This is not valid JSON yet. Fix the syntax before formatting or staging.';
		}
	}

	function formatRevision(input: string): string {
		try {
			return JSON.stringify(JSON.parse(input), null, 2);
		} catch {
			return input;
		}
	}

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
			formatRules();
		} catch {
			importError = 'Could not read the selected file.';
		}
	}
</script>

<section class="admin-page rules-page">
	<h1>Content Safety rules</h1>
	<p class="admin-page-intro">
		Stage a revision, review it, then activate it. Older revisions remain available for rollback.
		These rules are separate from listing vocabulary. New submissions use the active revision;
		matches and scanner failures enter the Safety cases queue.
	</p>
	{#if form?.error}<p role="alert">{form.error}</p>{/if}
	{#if form?.success}<p role="status">Rule revision saved.</p>{/if}
	<div class="admin-panel">
		<h2>1. Load and review rules</h2>
		<p class="help-text">
			Load the deployed <code>content/safety-rules.json</code> file or choose a JSON file from your device.
			Loading a file does not activate it.
		</p>
		<button
			type="button"
			onclick={() => {
				rules = data.instanceRuleFile;
				formatError = '';
			}}
		>
			Load deployed rules file
		</button>
		<label for="rules-file">Or choose a rules JSON file</label>
		<input id="rules-file" type="file" accept=".json,application/json" onchange={importRulesFile} />
		{#if importError}<p role="alert">{importError}</p>{/if}
		<form method="POST" action="?/stage">
			<h3 class="preview-heading">Review rules before staging</h3>
			{#if draftPreview.policy}
				<SafetyRuleReview policy={draftPreview.policy} />
			{:else}
				<p class="format-error" role="alert">{draftPreview.error}</p>
			{/if}
			<details class="advanced-editor">
				<summary>Edit raw JSON (advanced)</summary>
				<div class="editor-heading">
					<label for="rules-json">Rule JSON</label>
					<button class="secondary outline" type="button" onclick={formatRules}>Format JSON</button>
				</div>
				<textarea
					id="rules-json"
					name="rules"
					bind:value={rules}
					rows="18"
					wrap="off"
					spellcheck="false"
					autocapitalize="off"
					required
				></textarea>
				{#if formatError}<p class="format-error" role="alert">{formatError}</p>{/if}
				<p>
					The file uses named sections and a review queue for each section. Changes here update the
					review above; staging validates the full rule format.
				</p>
			</details>
			<label for="stage-reason">Change reason</label>
			<input id="stage-reason" name="reason" bind:value={reason} required maxlength="500" />
			<button type="submit" disabled={!draftPreview.policy}>Stage revision</button>
		</form>
	</div>
	<h2>2. Review and activate a revision</h2>
	{#if data.revisions.length === 0}
		<p class="admin-panel">No revisions staged yet. No safety rule set is active.</p>
	{:else}
		{#each data.revisions as revision (revision.id)}
			<article class="admin-panel">
				<h3>
					Revision {revision.version}{revision.id === data.activeRevisionId ? ' · Active' : ''}
				</h3>
				<p>{revision.reason} · {new Date(revision.createdAt).toLocaleString()}</p>
				<SafetyRuleReview policy={revision.policy} />
				<details>
					<summary>View raw JSON</summary>
					<pre>{formatRevision(revision.rulesJson)}</pre>
				</details>
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
		<p class="history-entry">
			{entry.actionType} · {entry.actorId} · {new Date(entry.createdAt).toLocaleString()} · {entry.reason}
		</p>
	{/each}
</section>

<style>
	.rules-page > h2 {
		margin: 2rem 0 1rem;
	}

	.help-text {
		color: var(--pico-muted-color);
		margin-bottom: 1rem;
	}

	.rules-page .admin-panel > button {
		margin-bottom: 0.75rem;
	}

	#rules-file {
		margin-bottom: 1rem;
	}

	.rules-page form > button[type='submit'] {
		margin-top: 1rem;
	}

	.editor-heading {
		display: flex;
		align-items: end;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.editor-heading label {
		margin-bottom: 0.4rem;
	}

	.editor-heading button {
		margin: 0 0 0.4rem;
		padding: 0.3rem 0.7rem;
		font-size: 0.85rem;
	}

	#rules-json,
	pre {
		font-family: ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', monospace;
		font-size: 0.875rem;
		line-height: 1.55;
		tab-size: 2;
	}

	#rules-json {
		width: 100%;
		min-height: 28rem;
		padding: 1rem;
		white-space: pre;
		overflow: auto;
		resize: vertical;
	}

	pre {
		white-space: pre;
		overflow: auto;
		max-height: 28rem;
	}

	.format-error {
		color: var(--pico-del-color);
	}

	details {
		margin: 0.75rem 0 1rem;
	}

	details p {
		margin: 0.75rem 0 0;
	}

	.history-entry {
		padding: 0.75rem 0;
		border-bottom: 1px solid var(--pico-muted-border-color);
		overflow-wrap: anywhere;
	}
</style>
