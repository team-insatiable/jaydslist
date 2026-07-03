<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form } = $props();

	const CATEGORY_LABELS: Record<string, string> = {
		harassment: 'Harassment',
		spam: 'Spam',
		fake_profile: 'Fake Profile',
		explicit_content: 'Explicit Content',
		unsolicited_dm: 'Unsolicited DM',
		other: 'Other'
	};

	const TARGET_LABELS: Record<string, string> = {
		listing: 'Listing',
		message: 'Message',
		user: 'User'
	};

	let expandedReport = $state<string | null>(null);
	let notes = $state<Record<string, string>>({});
	let submitting = $state<string | null>(null);

	function toggle(id: string) {
		expandedReport = expandedReport === id ? null : id;
	}

	function timeAgo(date: Date | null): string {
		if (!date) return '';
		const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
		if (s < 60) return 'just now';
		if (s < 3600) return `${Math.floor(s / 60)}m ago`;
		if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
		return `${Math.floor(s / 86400)}d ago`;
	}
</script>

<div>
	<div class="queue-header">
		<h1>Report Queue</h1>
		<div class="filter-tabs">
			<a href="/admin?status=pending" class:active={data.status === 'pending'}>Pending</a>
			<a href="/admin?status=actioned" class:active={data.status === 'actioned'}>Actioned</a>
			<a href="/admin?status=dismissed" class:active={data.status === 'dismissed'}>Dismissed</a>
		</div>
	</div>

	{#if form?.success}
		<div class="toast">
			{#if form.action === 'banned'}User banned and listings removed.
			{:else if form.action === 'listing_removed'}Listing removed.
			{:else if form.action === 'dismissed'}Report dismissed.
			{/if}
		</div>
	{/if}

	{#if data.reports.length === 0}
		<div class="empty">No {data.status} reports.</div>
	{:else}
		<ul class="report-list">
			{#each data.reports as report}
				<li class="report-card" class:open={expandedReport === report.id}>
					<button class="report-summary" onclick={() => toggle(report.id)} type="button">
						<span class="category-tag cat-{report.category}">{CATEGORY_LABELS[report.category] ?? report.category}</span>
						<span class="target-type">{TARGET_LABELS[report.targetType] ?? report.targetType}</span>
						{#if report.listingSubject}
							<span class="target-subject">{report.listingSubject}</span>
						{:else if report.targetAlias}
							<span class="target-subject">{report.targetAlias}</span>
						{:else}
							<span class="target-id">{report.targetId.slice(0, 8)}…</span>
						{/if}
						<span class="report-age">{timeAgo(report.createdAt)}</span>
						<span class="trust-score" title="Reporter trust score">{Math.round((report.reporterTrustScoreSnapshot ?? 0.5) * 100)}%</span>
						<svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="6 9 12 15 18 9"></polyline>
						</svg>
					</button>

					{#if expandedReport === report.id}
						<div class="report-detail">
							<div class="detail-row">
								<span class="detail-label">Reporter</span>
								<span>{report.reporterAlias ?? 'Unknown'} · {report.reporterTier ?? 'new'} · score {Math.round((report.reporterTrustScoreSnapshot ?? 0.5) * 100)}%</span>
							</div>
							<div class="detail-row">
								<span class="detail-label">Target</span>
								<span>
									{TARGET_LABELS[report.targetType] ?? report.targetType}
									{#if report.targetType === 'listing'}
										— <a href="/listings/{report.targetId}" target="_blank">{report.listingSubject ?? report.targetId}</a>
									{:else if report.targetType === 'user'}
										— {report.targetAlias ?? report.targetId}
									{:else}
										— {report.targetId}
									{/if}
								</span>
							</div>
							{#if report.detail}
								<div class="detail-row">
									<span class="detail-label">Detail</span>
									<span class="detail-body">{report.detail}</span>
								</div>
							{/if}
							{#if report.reviewerNotes}
								<div class="detail-row">
									<span class="detail-label">Notes</span>
									<span class="detail-body">{report.reviewerNotes}</span>
								</div>
							{/if}

							{#if data.status === 'pending'}
								<div class="notes-row">
									<textarea
										placeholder="Reviewer notes (optional)"
										bind:value={notes[report.id]}
										rows="2"
									></textarea>
								</div>

								<div class="action-row">
									<!-- Dismiss -->
									<form method="POST" action="?/dismiss" use:enhance={() => {
										submitting = report.id + '_dismiss';
										return async ({ result, update }) => {
											submitting = null;
											await update();
											await invalidateAll();
										};
									}}>
										<input type="hidden" name="reportId" value={report.id} />
										<input type="hidden" name="notes" value={notes[report.id] ?? ''} />
										<button type="submit" class="btn-dismiss" disabled={submitting !== null} aria-busy={submitting === report.id + '_dismiss'}>
											Dismiss
										</button>
									</form>

									{#if report.targetType === 'listing'}
										<!-- Remove listing -->
										<form method="POST" action="?/removeListing" use:enhance={() => {
											submitting = report.id + '_remove';
											return async ({ result, update }) => {
												submitting = null;
												await update();
												await invalidateAll();
											};
										}}>
											<input type="hidden" name="reportId" value={report.id} />
											<input type="hidden" name="listingId" value={report.targetId} />
											<input type="hidden" name="notes" value={notes[report.id] ?? ''} />
											<button type="submit" class="btn-warn" disabled={submitting !== null} aria-busy={submitting === report.id + '_remove'}>
												Remove Listing
											</button>
										</form>
									{/if}

									<!-- Ban user — need to resolve which user to ban -->
									{#if report.targetType === 'user'}
										<form method="POST" action="?/ban" use:enhance={() => {
											submitting = report.id + '_ban';
											return async ({ result, update }) => {
												submitting = null;
												await update();
												await invalidateAll();
											};
										}}>
											<input type="hidden" name="reportId" value={report.id} />
											<input type="hidden" name="targetUserId" value={report.targetId} />
											<input type="hidden" name="notes" value={notes[report.id] ?? ''} />
											<button type="submit" class="btn-ban" disabled={submitting !== null} aria-busy={submitting === report.id + '_ban'}>
												Ban User
											</button>
										</form>
									{/if}
								</div>
							{/if}
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	h1 {
		font-size: 1.3rem;
		font-weight: 700;
		margin: 0;
	}

	.queue-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.25rem;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.filter-tabs {
		display: flex;
		gap: 0.25rem;
	}

	.filter-tabs a {
		font-size: 0.8rem;
		font-weight: 500;
		padding: 0.3rem 0.75rem;
		border-radius: 6px;
		text-decoration: none;
		color: var(--pico-muted-color);
		border: 1px solid transparent;
	}

	.filter-tabs a:hover { color: var(--pico-color); }
	.filter-tabs a.active {
		color: var(--pico-primary);
		border-color: var(--pico-primary);
		background: color-mix(in srgb, var(--pico-primary) 8%, transparent);
	}

	.toast {
		background: color-mix(in srgb, var(--pico-ins-color) 12%, transparent);
		border: 1px solid color-mix(in srgb, var(--pico-ins-color) 30%, transparent);
		color: var(--pico-ins-color);
		padding: 0.6rem 1rem;
		border-radius: 8px;
		font-size: 0.875rem;
		margin-bottom: 1rem;
	}

	.empty {
		text-align: center;
		padding: 3rem 1rem;
		color: var(--pico-muted-color);
		font-size: 0.9rem;
	}

	.report-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.report-card {
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 10px;
		background: var(--pico-card-background-color);
		overflow: hidden;
	}

	.report-card.open {
		border-color: var(--pico-primary);
	}

	.report-summary {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
		font-family: inherit;
		font-size: 0.875rem;
		color: var(--pico-color);
		flex-wrap: wrap;
	}

	.report-summary:hover { background: color-mix(in srgb, var(--pico-primary) 4%, transparent); }

	.category-tag {
		font-size: 0.68rem;
		font-weight: 700;
		padding: 0.15rem 0.5rem;
		border-radius: 999px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		flex-shrink: 0;
	}

	.cat-harassment { background: color-mix(in srgb, var(--pico-del-color) 15%, transparent); color: var(--pico-del-color); }
	.cat-spam { background: color-mix(in srgb, #d97706 15%, transparent); color: #d97706; }
	.cat-fake_profile { background: color-mix(in srgb, #7c3aed 15%, transparent); color: #7c3aed; }
	.cat-explicit_content { background: color-mix(in srgb, #db2777 15%, transparent); color: #db2777; }
	.cat-unsolicited_dm { background: color-mix(in srgb, #0891b2 15%, transparent); color: #0891b2; }
	.cat-other { background: var(--pico-muted-background-color); color: var(--pico-muted-color); }

	.target-type {
		font-size: 0.75rem;
		color: var(--pico-muted-color);
		flex-shrink: 0;
	}

	.target-subject {
		flex: 1;
		min-width: 0;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.target-id {
		flex: 1;
		font-family: monospace;
		font-size: 0.75rem;
		color: var(--pico-muted-color);
	}

	.report-age {
		font-size: 0.75rem;
		color: var(--pico-muted-color);
		flex-shrink: 0;
	}

	.trust-score {
		font-size: 0.72rem;
		color: var(--pico-muted-color);
		flex-shrink: 0;
	}

	.chevron {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
		color: var(--pico-muted-color);
		margin-left: auto;
		transition: transform 0.15s;
	}

	.open .chevron { transform: rotate(180deg); }

	.report-detail {
		padding: 0 1rem 1rem;
		border-top: 1px solid var(--pico-muted-border-color);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.detail-row {
		display: flex;
		gap: 0.75rem;
		font-size: 0.8rem;
		padding-top: 0.5rem;
	}

	.detail-label {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--pico-muted-color);
		min-width: 60px;
		flex-shrink: 0;
		padding-top: 0.1rem;
	}

	.detail-body {
		color: var(--pico-color);
		line-height: 1.5;
	}

	.detail-row a {
		color: var(--pico-primary);
	}

	.notes-row {
		margin-top: 0.25rem;
	}

	.notes-row textarea {
		width: 100%;
		font-size: 0.8rem;
		resize: vertical;
		margin: 0;
		padding: 0.5rem 0.75rem;
	}

	.action-row {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.action-row form { margin: 0; }

	.action-row button {
		font-size: 0.8rem;
		font-weight: 600;
		padding: 0.4rem 1rem;
		border-radius: 6px;
		border: none;
		cursor: pointer;
		font-family: inherit;
		width: auto;
		margin: 0;
	}

	.btn-dismiss {
		background: var(--pico-muted-background-color);
		color: var(--pico-muted-color);
		border: 1px solid var(--pico-muted-border-color);
	}

	.btn-warn {
		background: color-mix(in srgb, #d97706 15%, transparent);
		color: #d97706;
		border: 1px solid color-mix(in srgb, #d97706 30%, transparent);
	}

	.btn-ban {
		background: color-mix(in srgb, var(--pico-del-color) 15%, transparent);
		color: var(--pico-del-color);
		border: 1px solid color-mix(in srgb, var(--pico-del-color) 30%, transparent);
	}

	.btn-dismiss:hover { color: var(--pico-color); border-color: var(--pico-color); }
</style>
