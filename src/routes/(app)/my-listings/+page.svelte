<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';

	let { data } = $props();

	let showRemoved = $state(false);

	const visibleListings = $derived(
		showRemoved ? data.myListings : data.myListings.filter((l) => l.status !== 'removed')
	);

	const removedCount = $derived(data.myListings.filter((l) => l.status === 'removed').length);
	const hasSlot = $derived(data.activeCount < data.maxActive);

	const STATUS_LABELS: Record<string, string> = {
		active: 'Active',
		paused: 'Paused',
		expired: 'Expired',
		lapsed: 'Lapsed',
		removed: 'Removed',
		flagged: 'Flagged',
		renewed: 'Renewed'
	};

	function timeAgo(date: Date | null): string {
		if (!date) return '';
		const s = Math.floor((Date.now() - date.getTime()) / 1000);
		if (s < 60) return 'just now';
		if (s < 3600) return `${Math.floor(s / 60)}m ago`;
		if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
		return `${Math.floor(s / 86400)}d ago`;
	}

	function daysUntil(date: Date | null): string {
		if (!date) return '';
		const days = Math.ceil((date.getTime() - Date.now()) / 86400000);
		if (days < 0) return 'Expired';
		if (days === 0) return 'Expires today';
		if (days === 1) return 'Expires tomorrow';
		return `Expires in ${days}d`;
	}

	function graceDeadline(expiresAt: Date | null, graceDays: number): string {
		if (!expiresAt) return '';
		const deadline = new Date(expiresAt.getTime() + graceDays * 86400_000);
		const days = Math.ceil((deadline.getTime() - Date.now()) / 86400_000);
		if (days <= 0) return 'Grace period ended';
		if (days === 1) return '1 day left to relist';
		return `${days} days left to relist`;
	}
</script>

<div class="page-wrap">
	<div class="page-head">
		<h1>My Listings</h1>
		<div class="head-actions">
			{#if removedCount > 0}
				<button
					class="toggle-removed"
					class:active={showRemoved}
					onclick={() => (showRemoved = !showRemoved)}
					title={showRemoved ? 'Hide deleted' : 'Show deleted'}
				>
					{#if showRemoved}
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							><path
								d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"
							/><path
								d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"
							/><line x1="1" y1="1" x2="23" y2="23" /></svg
						>
					{:else}
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle
								cx="12"
								cy="12"
								r="3"
							/></svg
						>
					{/if}
					{removedCount}
				</button>
			{/if}
			<a href={resolve('/post')} class="post-btn">+ New listing</a>
		</div>
	</div>

	{#if visibleListings.length === 0 && data.myListings.length === 0}
		<div class="empty">
			<p>You haven't posted any listings yet.</p>
			<a href={resolve('/post')} class="post-btn-lg">Create your first listing</a>
		</div>
	{:else if visibleListings.length === 0}
		<div class="empty">
			<p>
				All your deleted listings are hidden. <button
					class="text-btn"
					onclick={() => (showRemoved = true)}>Show them</button
				>
			</p>
		</div>
	{:else}
		<ul class="listings-list">
			{#each visibleListings as listing (listing.id)}
				<li
					class="listing-item"
					class:flagged={listing.status === 'flagged'}
					class:relisted={listing.status === 'expired' || listing.status === 'lapsed'}
				>
					<a href={resolve(`/listings/${listing.id}`)} class="listing-link">
						<div class="listing-top">
							<span class="listing-subject">{listing.subject}</span>
							<span class="status status-{listing.status}"
								>{STATUS_LABELS[listing.status] ?? listing.status}</span
							>
						</div>
						<div class="listing-meta">
							{#if listing.status === 'active' && listing.expiresAt}
								<span class="expires">{daysUntil(listing.expiresAt)}</span>
								<span class="sep">·</span>
							{:else if listing.status === 'expired' && listing.expiresAt}
								<span class="grace-deadline"
									>{graceDeadline(listing.expiresAt, data.graceDays)}</span
								>
								<span class="sep">·</span>
							{/if}
							<span>Posted {timeAgo(listing.createdAt)}</span>
							{#if listing.bumpCount > 0}
								<span class="sep">·</span>
								<span>{listing.bumpCount} bump{listing.bumpCount === 1 ? '' : 's'}</span>
							{/if}
							{#if listing.fuzzyLocation}
								<span class="sep">·</span>
								<span>{listing.fuzzyLocation}</span>
							{/if}
						</div>
					</a>

					{#if listing.status === 'flagged'}
						<div class="flagged-bar">
							Suspended by moderator — <a href={resolve(`/listings/${listing.id}/edit`)}
								>Edit to reactivate</a
							>
						</div>
					{:else if listing.status === 'expired' || listing.status === 'lapsed'}
						<div class="relist-bar">
							{#if hasSlot}
								<form method="POST" action="?/relist" use:enhance>
									<input type="hidden" name="listingId" value={listing.id} />
									<button type="submit" class="relist-btn">Relist</button>
								</form>
							{:else}
								<span class="relist-blocked"
									>No open slot — pause or remove an active listing to relist this one.</span
								>
							{/if}
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.page-wrap {
		max-width: 600px;
		margin: 0 auto;
	}

	.page-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.5rem;
	}

	.page-head h1 {
		font-size: 1.3rem;
		font-weight: 700;
		margin: 0;
	}

	.head-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.toggle-removed {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.35rem 0.65rem;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--pico-muted-color);
		background: var(--pico-muted-background-color);
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 6px;
		cursor: pointer;
		font-family: inherit;
		transition:
			color 0.15s,
			border-color 0.15s;
	}

	.toggle-removed svg {
		width: 14px;
		height: 14px;
		flex-shrink: 0;
	}

	.toggle-removed:hover {
		color: var(--pico-color);
		border-color: var(--pico-color);
	}

	.toggle-removed.active {
		color: var(--pico-primary);
		border-color: var(--pico-primary);
		background: color-mix(in srgb, var(--pico-primary) 8%, transparent);
	}

	.text-btn {
		background: none;
		border: none;
		padding: 0;
		color: var(--pico-primary);
		cursor: pointer;
		font-family: inherit;
		font-size: inherit;
		text-decoration: underline;
	}

	.post-btn {
		font-size: 0.875rem;
		font-weight: 600;
		padding: 0.4rem 1rem;
		background: var(--pico-primary);
		color: #fff;
		border-radius: 7px;
		text-decoration: none;
	}

	.post-btn:hover {
		background: var(--pico-primary-hover);
		text-decoration: none;
		color: #fff;
	}

	.empty {
		text-align: center;
		padding: 3rem 1rem;
		color: var(--pico-muted-color);
	}

	.post-btn-lg {
		display: inline-block;
		margin-top: 1rem;
		padding: 0.7rem 1.5rem;
		background: var(--pico-primary);
		color: #fff;
		border-radius: 8px;
		font-weight: 600;
		text-decoration: none;
	}

	.listings-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.listing-item {
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 10px;
		margin-bottom: 0.75rem;
		background: var(--pico-card-background-color);
		overflow: hidden;
	}

	.listing-link {
		display: block;
		padding: 1rem 1.125rem;
		text-decoration: none;
		color: inherit;
	}

	.listing-link:hover {
		background: color-mix(in srgb, var(--pico-primary) 4%, transparent);
	}

	.listing-top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.4rem;
	}

	.listing-subject {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--pico-color);
		flex: 1;
		min-width: 0;
	}

	.status {
		font-size: 0.68rem;
		font-weight: 600;
		padding: 0.15rem 0.5rem;
		border-radius: 999px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		flex-shrink: 0;
	}

	.status-active {
		background: color-mix(in srgb, #16a34a 12%, transparent);
		color: #16a34a;
	}

	.status-paused {
		background: color-mix(in srgb, #d97706 12%, transparent);
		color: #d97706;
	}

	.status-expired {
		background: color-mix(in srgb, #6366f1 12%, transparent);
		color: #6366f1;
	}

	.status-lapsed,
	.status-removed {
		background: var(--pico-muted-background-color);
		color: var(--pico-muted-color);
	}

	.status-flagged {
		background: color-mix(in srgb, #d97706 12%, transparent);
		color: #d97706;
	}

	.listing-item.flagged {
		border-color: color-mix(in srgb, #d97706 40%, transparent);
	}

	.listing-item.relisted {
		border-color: color-mix(in srgb, #6366f1 30%, transparent);
	}

	.flagged-bar,
	.relist-bar {
		padding: 0.5rem 1.125rem;
		font-size: 0.78rem;
		border-top: 1px solid var(--pico-muted-border-color);
		background: color-mix(in srgb, var(--pico-muted-background-color) 60%, transparent);
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.flagged-bar {
		color: #d97706;
		border-top-color: color-mix(in srgb, #d97706 20%, transparent);
		background: color-mix(in srgb, #d97706 5%, transparent);
	}

	.flagged-bar a {
		color: #d97706;
		font-weight: 600;
	}

	.relist-btn {
		font-size: 0.78rem;
		font-weight: 600;
		padding: 0.25rem 0.75rem;
		background: var(--pico-primary);
		color: #fff;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-family: inherit;
	}

	.relist-btn:hover {
		background: var(--pico-primary-hover);
	}

	.relist-blocked {
		color: var(--pico-muted-color);
		font-style: italic;
	}

	.listing-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.78rem;
		color: var(--pico-muted-color);
	}

	.expires {
		color: var(--pico-primary);
		font-weight: 500;
	}

	.grace-deadline {
		color: #6366f1;
		font-weight: 500;
	}

	.sep {
		opacity: 0.4;
	}
</style>
