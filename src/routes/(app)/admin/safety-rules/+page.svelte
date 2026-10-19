<script lang="ts">
	import SafetyRuleReview from '$lib/components/admin/SafetyRuleReview.svelte';
	import { parseSafetyPolicy, type SafetyPolicy } from '$lib/content-safety/rules';
	let { data, form } = $props();
	let rules = $state(JSON.stringify({ schemaVersion: 2, sections: [] }, null, 2));
	let reason = $state('');
	let activationReason = $state('');
	let importError = $state('');
	let formatError = $state('');
	let activeRevision = $derived(
		data.revisions.find((revision) => revision.id === data.activeRevisionId)
	);
	const ruleCount = (policy: SafetyPolicy) =>
		policy.sections.reduce((count, section) => count + section.rules.length, 0);
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
			formatError = 'This is not valid JSON yet. Fix the syntax before formatting or saving.';
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
		Review the checks used for listings and messages. You can turn on a reviewed rule set in one
		step or save it as a draft for later.
	</p>
	{#if form?.error}<p role="alert">{form.error}</p>{/if}
	{#if form?.success}
		<p role="status">
			{form.action === 'activated' || form.action === 'published'
				? 'Rules are now active.'
				: 'Draft saved. Turn it on when you are ready.'}
		</p>
	{/if}
	<div class="status-panel" class:active={!!activeRevision} role="status">
		{#if activeRevision}
			<strong>Rule set {activeRevision.version} is active</strong>
			<p>New submissions are checked against its {ruleCount(activeRevision.policy)} rules.</p>
		{:else}
			<strong>No rules are active</strong>
			<p>New submissions are held for system review until you turn on a rule set.</p>
		{/if}
	</div>
	<h2>Saved rule sets</h2>
	{#if data.revisions.length === 0}
		<p class="admin-panel">No drafts saved yet. Load a rules file below to get started.</p>
	{:else}
		{#each data.revisions as revision (revision.id)}
			<article class="admin-panel revision-card">
				<div class="revision-heading">
					<h3>Rule set {revision.version}</h3>
					<span class:active={revision.id === data.activeRevisionId} class="revision-status">
						{revision.id === data.activeRevisionId ? 'Active' : 'Not active'}
					</span>
				</div>
				<p class="revision-summary">
					{revision.policy.sections.length} sections · {ruleCount(revision.policy)} rules · Saved
					{new Date(revision.createdAt).toLocaleString()}
				</p>
				<p class="revision-reason"><strong>Saved because:</strong> {revision.reason}</p>
				<details class="review-details">
					<summary>Review all {ruleCount(revision.policy)} rules</summary>
					<SafetyRuleReview policy={revision.policy} />
					<details>
						<summary>View raw JSON</summary>
						<pre>{formatRevision(revision.rulesJson)}</pre>
					</details>
				</details>
				{#if revision.id !== data.activeRevisionId}
					<form method="POST" action="?/activate" class="activation-form">
						<input type="hidden" name="revisionId" value={revision.id} />
						{#if data.activeRevisionId}
							<label for="activate-{revision.id}"
								>Why are you switching to rule set {revision.version}?</label
							>
							<input
								id="activate-{revision.id}"
								name="reason"
								bind:value={activationReason}
								required
								maxlength="500"
							/>
						{:else}
							<p class="help-text">Your saved note will be used for the activation record.</p>
						{/if}
						<p class="help-text">New submissions will use these rules immediately.</p>
						<button type="submit">
							{data.activeRevisionId
								? `Switch to rule set ${revision.version}`
								: `Turn on rule set ${revision.version}`}
						</button>
					</form>
				{/if}
			</article>
		{/each}
	{/if}
	<details class="admin-panel" open={data.revisions.length === 0}>
		<summary>Load or change rules</summary>
		<p class="help-text">
			Load the deployed <code>content/safety-rules.json</code> file or choose a JSON file from your device.
			Review the file below before turning it on or saving a draft.
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
		<form method="POST" action="?/publish">
			<h3 class="preview-heading">Review rules before saving</h3>
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
					review above; saving validates the full rule format.
				</p>
			</details>
			<label for="stage-reason">Why are you saving these rules?</label>
			<input id="stage-reason" name="reason" bind:value={reason} required maxlength="500" />
			<p class="help-text">Turning rules on applies them to new submissions immediately.</p>
			<div class="rule-actions">
				<button type="submit" disabled={!draftPreview.policy}>Save and turn on rules</button>
				<button
					type="submit"
					formaction="?/stage"
					class="secondary outline"
					disabled={!draftPreview.policy}>Save draft instead</button
				>
			</div>
		</form>
	</details>
	<details class="history-panel">
		<summary>Change history</summary>
		{#if data.history.length === 0}<p>No changes recorded yet.</p>{/if}
		{#each data.history as entry (entry.id)}
			<div class="history-entry">
				<p>
					<strong
						>{entry.actionType === 'stage_revision'
							? 'Draft saved'
							: entry.actionType === 'activate_revision'
								? 'Rules turned on'
								: entry.actionType === 'publish_revision'
									? 'Rule set saved and turned on'
									: entry.actionType}</strong
					>
					· {new Date(entry.createdAt).toLocaleString()}
				</p>
				<p>{entry.reason}</p>
				<details><summary>Audit details</summary><code>Admin ID: {entry.actorId}</code></details>
			</div>
		{/each}
	</details>
</section>

<style>
	.rules-page > h2 {
		margin: 2rem 0 1rem;
	}

	.status-panel {
		padding: 1rem 1.25rem;
		border: 1px solid var(--pico-muted-border-color);
		border-left: 4px solid var(--pico-del-color);
		border-radius: 0.6rem;
		background: var(--pico-card-background-color);
	}

	.status-panel.active {
		border-left-color: var(--pico-ins-color);
	}

	.status-panel p {
		margin: 0.35rem 0 0;
		color: var(--pico-muted-color);
	}

	.revision-heading {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.revision-heading h3 {
		margin: 0;
	}

	.revision-status {
		padding: 0.2rem 0.65rem;
		border-radius: 999px;
		background: var(--pico-muted-background-color);
		color: var(--pico-muted-color);
		font-size: 0.8rem;
		font-weight: 700;
	}

	.revision-status.active {
		background: color-mix(in srgb, var(--pico-ins-color) 15%, transparent);
		color: var(--pico-ins-color);
	}

	.revision-summary {
		margin: 0.75rem 0;
		color: var(--pico-muted-color);
	}

	.revision-reason {
		margin-bottom: 1rem;
	}

	.activation-form {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--pico-muted-border-color);
	}

	.activation-form .help-text {
		margin: 0 0 0.75rem;
		font-size: 0.9rem;
	}

	.review-details {
		margin-bottom: 0.75rem;
	}

	.rules-page > details.admin-panel > summary,
	.history-panel > summary {
		font-size: 1.1rem;
		font-weight: 700;
	}

	.history-panel {
		margin: 2rem 0;
	}

	.history-panel .history-entry p {
		margin: 0 0 0.4rem;
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

	.rule-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.rule-actions button {
		margin: 0;
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
