<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';

	let { data } = $props();

	const listing = $derived(data.listing);
	const requirements = $derived(data.requirements);
	const termDefinitions = $derived(data.termDefinitions);
	const isOwner = $derived(data.isOwner);
	const isLoggedIn = $derived(data.isLoggedIn);
	const unavailable = $derived(data.unavailable);

	let confirmingDelete = $state(false);
	let showReportForm = $state(false);
	let reportCategory = $state('');
	let reportDetail = $state('');
	let reportSubmitting = $state(false);
	let reportDone = $state(false);

	const IDENTITY_LABELS: Record<string, string> = {
		man: 'Man',
		woman: 'Woman',
		non_binary: 'Non-binary',
		transgender_man: 'Trans man',
		transgender_woman: 'Trans woman',
		couple: 'Couple',
		other: 'Other'
	};

	const IDENTITY_PLURAL: Record<string, string> = {
		man: 'Men',
		woman: 'Women',
		non_binary: 'Non-binary',
		transgender_man: 'Trans men',
		transgender_woman: 'Trans women',
		couple: 'Couples',
		other: 'Other'
	};

	const COUPLE_COMPOSITION_LABELS: Record<string, string> = {
		mf: 'Man + Woman',
		mm: 'Man + Man',
		ff: 'Woman + Woman',
		other: 'Other'
	};

	const NATURE_LABELS: Record<string, string> = {
		dating: 'Dating',
		fwb: 'Friends with Benefits',
		one_time: 'No Strings Attached',
		platonic: 'Strictly Platonic',
		open: 'Open to Anything'
	};

	const MOOD_LABELS: Record<string, string> = {
		coffee_first: 'Coffee first',
		dinner_date: 'Dinner / proper date',
		netflix_chill: 'Netflix & Chill',
		ready_now: 'Ready now',
		just_browsing: 'Just browsing'
	};

	const TRUST_LABELS: Record<string, string> = {
		new: 'New',
		established: 'Member',
		trusted: 'Trusted'
	};

	const TRUST_TIER_LABELS: Record<string, string> = {
		new: 'New members and up',
		established: 'Established members only',
		trusted: 'Trusted members only'
	};

	function timeAgo(date: Date | null): string {
		if (!date) return '';
		const s = Math.floor((Date.now() - date.getTime()) / 1000);
		if (s < 60) return 'just now';
		if (s < 3600) return `${Math.floor(s / 60)}m ago`;
		if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
		return `${Math.floor(s / 86400)}d ago`;
	}

	function formatDate(date: Date | null): string {
		if (!date) return '';
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	const posterLabel = $derived.by(() => {
		if (listing.posterIdentity === 'couple' && listing.posterCoupleComposition) {
			return `Couple (${COUPLE_COMPOSITION_LABELS[listing.posterCoupleComposition] ?? listing.posterCoupleComposition})`;
		}
		return IDENTITY_LABELS[listing.posterIdentity ?? ''] ?? listing.posterIdentity ?? 'Unknown';
	});

	const seekingLabel = $derived.by(() => {
		if (listing.lookingForIdentity.length === 0) return 'Anyone';
		return listing.lookingForIdentity
			.map((id) => IDENTITY_PLURAL[id] ?? IDENTITY_LABELS[id] ?? id)
			.join(' or ');
	});

	const ageLabel = $derived.by(() => {
		if (listing.posterAge) return String(listing.posterAge);
		return null;
	});
</script>

<div class="detail-wrap">
	{#if unavailable}
	<div class="detail-card unavailable-card">
		<button class="back-link" onclick={() => history.back()}>← Back</button>
		<div class="unavailable-body">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
			</svg>
			<h2>This listing is no longer active</h2>
			<p>"{listing.subject}"</p>
			<p class="unavailable-hint">The poster may have paused or removed it. Any existing conversations are still in your inbox.</p>
			{#if isLoggedIn}
				<a href="/inbox" class="inbox-link">Go to inbox</a>
			{/if}
		</div>
	</div>
	{:else}
	<div class="detail-card">
		<!-- Header -->
		<div class="detail-head">
			<div class="head-left">
				<button class="back-link" onclick={() => isOwner ? goto('/my-listings') : history.back()}>← Back</button>
			</div>
			{#if isOwner}
				<span class="owner-badge">Your listing</span>
			{/if}
		</div>

		<!-- Subject -->
		<h1 class="subject">{listing.subject}</h1>

		<!-- Poster meta -->
		<div class="poster-meta">
			<span class="trust trust-{listing.posterTrustTier}">
				{TRUST_LABELS[listing.posterTrustTier ?? 'new'] ?? 'New'}
			</span>
			<span class="poster-id">
				{posterLabel}
				{#if ageLabel}&nbsp;· {ageLabel}{/if}
			</span>
			{#if listing.fuzzyLocation}
				<span class="sep">·</span>
				<span class="location">{listing.fuzzyLocation}</span>
			{/if}
			<span class="sep">·</span>
			<span class="time">{timeAgo(listing.lastBumpedAt)}</span>
		</div>

		<!-- Nature + mood + seeking chips -->
		<div class="chips">
			{#each listing.natureOfConnection as n}
				<span class="chip chip-nature">{NATURE_LABELS[n] ?? n}</span>
			{/each}
			{#if listing.mood}
				<span class="chip chip-mood">{MOOD_LABELS[listing.mood] ?? listing.mood}</span>
			{/if}
			{#if seekingLabel !== 'Anyone'}
				<span class="chip chip-seeking">
					Seeking {seekingLabel}{#if listing.ageRangeMin || listing.ageRangeMax}&nbsp;
						{#if listing.ageRangeMin && listing.ageRangeMax}· {listing.ageRangeMin}–{listing.ageRangeMax}{:else if listing.ageRangeMin}· {listing.ageRangeMin}+{:else}· –{listing.ageRangeMax}{/if}
					{/if}
				</span>
			{/if}
		</div>

		<!-- Body -->
		<div class="listing-body">
			{#each listing.body.split('\n') as line}
				{#if line.trim()}
					<p>{line}</p>
				{:else}
					<br />
				{/if}
			{/each}
		</div>

		<!-- Relative terms glossary -->
		{#if termDefinitions.length > 0}
			<div class="glossary">
				<h3 class="glossary-title">What I mean by…</h3>
				<dl class="term-list">
					{#each termDefinitions as { term, definition }}
						<div class="term-row">
							<dt>{term}</dt>
							<dd>{definition}</dd>
						</div>
					{/each}
				</dl>
			</div>
		{/if}

		<!-- Requirements -->
		{#if requirements.trustTierMin || requirements.softPrompts.length > 0}
			<div class="reqs-section">
				<h3 class="reqs-title">Requirements</h3>
				{#if requirements.trustTierMin}
					<p class="hard-req">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="req-icon">
							<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
						</svg>
						{TRUST_TIER_LABELS[requirements.trustTierMin] ?? requirements.trustTierMin}
					</p>
				{/if}
				{#if requirements.softPrompts.length > 0}
					<ul class="soft-reqs">
						{#each requirements.softPrompts as prompt}
							<li>{prompt}</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/if}

		<!-- Footer meta -->
		<div class="detail-footer">
			<span>Posted {formatDate(listing.createdAt)}</span>
			{#if listing.expiresAt}
				<span>Expires {formatDate(listing.expiresAt)}</span>
			{/if}
		</div>

		<!-- CTA -->
		<div class="cta-area">
			{#if isOwner}
				<div class="owner-toolbar">
					{#if listing.status === 'active'}
						<form id="pause-form" method="POST" action="?/pause" style="display:none" use:enhance></form>
						<form id="bump-form" method="POST" action="?/bump" style="display:none" use:enhance></form>
						<button class="tool-btn tool-bump" form="bump-form" type="submit"
							disabled={!data.canBump}
							title={data.canBump ? 'Bump to top of feed' : `Available ${data.nextBumpAt ? new Date(data.nextBumpAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'later'}`}>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
							Bump
						</button>
						<a href="/listings/{listing.id}/edit" class="tool-btn tool-edit">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
							Edit
						</a>
						<button class="tool-btn tool-pause" form="pause-form" type="submit">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
							Pause
						</button>
					{:else if listing.status === 'paused'}
						<div class="status-notice notice-paused">Paused — not visible to others</div>
						<form id="resume-form" method="POST" action="?/resume" style="display:none" use:enhance></form>
						<form id="delete-form" method="POST" action="?/delete" style="display:none"
							use:enhance={() => () => goto('/my-listings')}></form>
						<div class="paused-actions">
							<button class="tool-btn tool-resume" form="resume-form" type="submit">
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
								Resume
							</button>
							{#if confirmingDelete}
								<button class="tool-btn confirm-cancel" type="button" onclick={() => confirmingDelete = false}>Cancel</button>
								<button class="tool-btn confirm-yes" form="delete-form" type="submit">Yes, delete</button>
							{:else}
								<button class="tool-btn tool-remove" type="button" onclick={() => confirmingDelete = true}>
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
									Delete
								</button>
							{/if}
						</div>
					{:else if listing.status === 'removed'}
						<div class="status-notice notice-removed">This listing has been deleted — only you can see it</div>
						<form id="restore-form" method="POST" action="?/restore" style="display:none" use:enhance></form>
						<button class="tool-btn tool-resume" form="restore-form" type="submit" style="width:100%">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
							Restore listing
						</button>
					{/if}
				</div>
			{:else if isLoggedIn}
				{#if data.existingThreadId}
					<a href="/inbox/{data.existingThreadId}" class="respond-btn">View conversation</a>
				{:else}
					<a href="/inbox/new?listing={listing.id}" class="respond-btn">Reply to this listing</a>
				{/if}
			{:else}
				<a href={resolve('/register')} class="respond-btn">Sign up to respond</a>
				<p class="login-hint">Already have an account? <a href={resolve('/login')}>Sign in</a></p>
			{/if}
		</div>

		{#if isLoggedIn && !isOwner}
			<div class="report-section">
				{#if reportDone}
					<p class="report-done">Report submitted. Our moderation team will review it.</p>
				{:else if showReportForm}
					<form method="POST" action="?/report" use:enhance={() => {
						reportSubmitting = true;
						return async ({ result, update }) => {
							reportSubmitting = false;
							if (result.type === 'success') { reportDone = true; showReportForm = false; }
							await update();
						};
					}} class="report-form">
						<p class="report-form-title">Report this listing</p>
						<select name="category" bind:value={reportCategory} required>
							<option value="" disabled>Select a reason…</option>
							<option value="spam">Spam</option>
							<option value="fake_profile">Fake profile</option>
							<option value="harassment">Harassment</option>
							<option value="explicit_content">Unsolicited explicit content</option>
							<option value="unsolicited_dm">Unsolicited DM pattern</option>
							<option value="other">Other</option>
						</select>
						<textarea name="detail" bind:value={reportDetail} placeholder="Additional details (optional)" rows="3"></textarea>
						<div class="report-actions">
							<button type="button" class="report-cancel" onclick={() => showReportForm = false}>Cancel</button>
							<button type="submit" class="report-submit" disabled={!reportCategory || reportSubmitting} aria-busy={reportSubmitting}>
								Submit report
							</button>
						</div>
					</form>
				{:else}
					<button type="button" class="report-link" onclick={() => showReportForm = true}>Report this listing</button>
				{/if}
			</div>
		{/if}
	</div>
	{/if}
</div>

<style>
	.detail-wrap {
		max-width: 680px;
		margin: 0 auto;
		padding: 1rem;
	}

	.unavailable-card {
		text-align: center;
	}

	.unavailable-body {
		padding: 2rem 1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.unavailable-body svg {
		width: 40px;
		height: 40px;
		color: var(--pico-muted-color);
		margin-bottom: 0.5rem;
	}

	.unavailable-body h2 {
		font-size: 1.1rem;
		font-weight: 600;
		margin: 0;
	}

	.unavailable-body p {
		color: var(--pico-muted-color);
		font-size: 0.875rem;
		margin: 0;
	}

	.unavailable-hint {
		max-width: 320px;
		line-height: 1.5;
	}

	.inbox-link {
		margin-top: 0.75rem;
		display: inline-block;
		padding: 0.6rem 1.25rem;
		background: var(--pico-primary);
		color: #fff;
		border-radius: 8px;
		font-weight: 600;
		font-size: 0.875rem;
		text-decoration: none;
	}

	.detail-card {
		background: var(--pico-card-background-color);
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 12px;
		padding: 1.5rem;
	}

	.detail-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.25rem;
	}

	.back-link {
		font-size: 0.875rem;
		color: var(--pico-muted-color);
		text-decoration: none;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		font-family: inherit;
	}

	.back-link:hover {
		color: var(--pico-primary);
	}

	.owner-badge {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--pico-primary);
		background: color-mix(in srgb, var(--pico-primary) 10%, transparent);
		padding: 0.2rem 0.6rem;
		border-radius: 999px;
	}

	.subject {
		font-size: 1.3rem;
		font-weight: 700;
		line-height: 1.3;
		margin-bottom: 0.75rem;
	}

	.poster-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem;
		margin-bottom: 0.875rem;
		font-size: 0.825rem;
		color: var(--pico-muted-color);
	}

	.trust {
		font-size: 0.68rem;
		font-weight: 600;
		padding: 0.15rem 0.5rem;
		border-radius: 999px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.trust-new {
		background: var(--pico-muted-background-color);
		color: var(--pico-muted-color);
	}

	.trust-established {
		background: color-mix(in srgb, var(--pico-primary) 12%, transparent);
		color: var(--pico-primary);
	}

	.trust-trusted {
		background: color-mix(in srgb, #16a34a 12%, transparent);
		color: #16a34a;
	}

	.poster-id {
		font-weight: 500;
		color: var(--pico-color);
	}

	.sep {
		opacity: 0.4;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 1rem;
	}

	.chip {
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.25rem 0.65rem;
		border-radius: 999px;
	}

	.chip-nature {
		background: color-mix(in srgb, var(--pico-primary) 10%, transparent);
		color: var(--pico-primary);
	}

	.chip-mood {
		background: var(--pico-muted-background-color);
		color: var(--pico-muted-color);
	}

	.chip-seeking {
		background: var(--pico-muted-background-color);
		color: var(--pico-muted-color);
	}

	.listing-body {
		font-size: 0.9375rem;
		line-height: 1.65;
		margin-bottom: 1.5rem;
		color: var(--pico-color);
	}

	.listing-body p {
		margin-bottom: 0.5rem;
	}

	.glossary {
		margin-bottom: 1.25rem;
		padding: 1rem;
		background: var(--pico-muted-background-color);
		border-radius: 8px;
		border-left: 3px solid var(--pico-primary);
	}

	.glossary-title {
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--pico-muted-color);
		margin-bottom: 0.6rem;
	}

	.term-list {
		margin: 0;
	}

	.term-row {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.35rem;
		font-size: 0.875rem;
		align-items: baseline;
	}

	.term-row dt {
		font-weight: 600;
		color: var(--pico-primary);
		min-width: 100px;
		flex-shrink: 0;
	}

	.term-row dd {
		margin: 0;
		color: var(--pico-color);
	}

	.reqs-section {
		margin-bottom: 1.25rem;
		padding: 1rem;
		background: var(--pico-muted-background-color);
		border-radius: 8px;
	}

	.reqs-title {
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--pico-muted-color);
		margin-bottom: 0.6rem;
	}

	.hard-req {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--pico-color);
		margin-bottom: 0.5rem;
	}

	.req-icon {
		width: 14px;
		height: 14px;
		flex-shrink: 0;
		color: var(--pico-primary);
	}

	.soft-reqs {
		margin: 0;
		padding-left: 1.25rem;
		font-size: 0.875rem;
		color: var(--pico-color);
	}

	.soft-reqs li {
		margin-bottom: 0.3rem;
	}

	.detail-footer {
		display: flex;
		justify-content: space-between;
		font-size: 0.75rem;
		color: var(--pico-muted-color);
		border-top: 1px solid var(--pico-muted-border-color);
		padding-top: 0.75rem;
		margin-bottom: 1.25rem;
		opacity: 0.7;
	}

	.cta-area {
		text-align: center;
	}

	.respond-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.8rem 2rem;
		font-size: 1rem;
		font-weight: 600;
		background: var(--pico-primary);
		color: #fff;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		text-decoration: none;
		transition: background 0.15s;
		width: 100%;
		justify-content: center;
	}

	.respond-btn:hover:not(:disabled) {
		background: var(--pico-primary-hover);
	}

	.respond-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.coming-soon {
		font-size: 0.72rem;
		font-weight: 400;
		opacity: 0.7;
	}

	.login-hint {
		margin-top: 0.75rem;
		font-size: 0.875rem;
		color: var(--pico-muted-color);
	}

	.report-section {
		margin-top: 1.5rem;
		padding-top: 1rem;
		border-top: 1px solid var(--pico-muted-border-color);
	}

	.report-link {
		background: none;
		border: none;
		padding: 0;
		font-size: 0.78rem;
		color: var(--pico-muted-color);
		cursor: pointer;
		font-family: inherit;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.report-link:hover { color: var(--pico-del-color); }

	.report-form-title {
		font-size: 0.875rem;
		font-weight: 600;
		margin-bottom: 0.75rem;
	}

	.report-form select, .report-form textarea {
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
	}

	.report-form textarea { resize: vertical; }

	.report-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}

	.report-cancel {
		background: none;
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 6px;
		padding: 0.4rem 1rem;
		font-size: 0.8rem;
		color: var(--pico-muted-color);
		cursor: pointer;
		font-family: inherit;
		width: auto;
		margin: 0;
	}

	.report-submit {
		background: color-mix(in srgb, var(--pico-del-color) 15%, transparent);
		color: var(--pico-del-color);
		border: 1px solid color-mix(in srgb, var(--pico-del-color) 30%, transparent);
		border-radius: 6px;
		padding: 0.4rem 1rem;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		font-family: inherit;
		width: auto;
		margin: 0;
	}

	.report-done {
		font-size: 0.8rem;
		color: var(--pico-ins-color);
	}

	.owner-toolbar {
		display: flex;
		gap: 0.5rem;
		align-items: stretch;
	}

	.tool-btn {
		display: flex;
		flex: 1 1 0;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		height: 44px;
		padding: 0 0.75rem;
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		line-height: 1;
		border-radius: 8px;
		border: 1px solid var(--pico-muted-border-color);
		background: var(--pico-muted-background-color);
		color: var(--pico-color);
		cursor: pointer;
		font-family: inherit;
		transition: border-color 0.15s, color 0.15s;
		min-width: 0;
		box-sizing: border-box;
	}

	.tool-btn svg {
		width: 15px;
		height: 15px;
		flex-shrink: 0;
	}

	.tool-btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.tool-bump:not(:disabled):hover {
		border-color: var(--pico-primary);
		color: var(--pico-primary);
	}

	.tool-edit:not(:disabled):hover {
		border-color: var(--pico-primary);
		color: var(--pico-primary);
	}

	.tool-pause:hover {
		border-color: #d97706;
		color: #d97706;
	}

	.tool-resume {
		border-color: color-mix(in srgb, #16a34a 30%, transparent);
		color: #16a34a;
	}

	.tool-resume:hover {
		background: color-mix(in srgb, #16a34a 8%, transparent);
		border-color: #16a34a;
	}

	.tool-remove {
		color: var(--pico-del-color);
		border-color: color-mix(in srgb, var(--pico-del-color) 30%, transparent);
	}

	.tool-remove:hover {
		background: color-mix(in srgb, var(--pico-del-color) 8%, transparent);
		border-color: var(--pico-del-color);
	}

	.status-notice {
		font-size: 0.8rem;
		font-weight: 500;
		text-align: center;
		padding: 0.5rem 0.75rem;
		border-radius: 6px;
		margin-bottom: 0.5rem;
	}

	.notice-paused {
		background: color-mix(in srgb, #d97706 10%, transparent);
		color: #d97706;
	}

	.notice-removed {
		background: var(--pico-muted-background-color);
		color: var(--pico-muted-color);
	}

	.paused-actions {
		display: flex;
		gap: 0.5rem;
		width: 100%;
	}

	.confirm-delete {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 0.875rem 1rem;
		background: color-mix(in srgb, var(--pico-del-color) 8%, transparent);
		border: 1px solid color-mix(in srgb, var(--pico-del-color) 25%, transparent);
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--pico-del-color);
		text-align: center;
	}

	.confirm-actions {
		display: flex;
		gap: 0.5rem;
		width: 100%;
	}

	.confirm-cancel, .confirm-yes {
		flex: 1;
		padding: 0.5rem;
		border-radius: 6px;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		border: 1px solid;
		font-family: inherit;
	}

	.confirm-cancel {
		background: transparent;
		border-color: var(--pico-muted-border-color);
		color: var(--pico-muted-color);
	}

	.confirm-cancel:hover {
		border-color: var(--pico-color);
		color: var(--pico-color);
	}

	.confirm-yes {
		background: var(--pico-del-color);
		border-color: var(--pico-del-color);
		color: #fff;
	}

	.confirm-yes:hover {
		opacity: 0.9;
	}

	.btn-secondary {
		display: inline-flex;
		padding: 0.7rem 1.5rem;
		font-size: 0.9rem;
		font-weight: 600;
		background: var(--pico-muted-background-color);
		color: var(--pico-color);
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 8px;
		text-decoration: none;
		transition: border-color 0.15s;
	}

	.btn-secondary:hover {
		border-color: var(--pico-primary);
		color: var(--pico-primary);
	}
</style>
