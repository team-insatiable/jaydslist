<script lang="ts">
	import { resolve } from '$app/paths';

	export type Listing = {
		id: string;
		subject: string;
		identity: string;
		age: number;
		lookingFor: string[];
		nature: string[];
		mood: string | null;
		availability: string | null;
		trustTier: 'new' | 'established' | 'trusted';
		fuzzyLocation: string;
		distance: number | null;
		postedAt: Date;
	};

	let { listing, compact = false }: { listing: Listing; compact?: boolean } = $props();

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

	const NATURE_LABELS: Record<string, string> = {
		dating: 'Dating',
		fwb: 'FWB',
		one_time: 'NSA',
		platonic: 'Platonic',
		open: 'Open'
	};

	const MOOD_LABELS: Record<string, string> = {
		coffee_first: 'Coffee first',
		dinner_date: 'Dinner date',
		netflix_chill: 'Netflix & chill',
		ready_now: 'Ready now',
		just_browsing: 'Just browsing'
	};

	const AVAIL_LABELS: Record<string, string> = {
		available_now: 'Now',
		available_today: 'Today',
		available_weekend: 'Weekend',
		flexible: 'Flexible'
	};

	const TRUST_TITLES: Record<string, string> = {
		new: 'New member',
		established: 'Established member',
		trusted: 'Trusted member'
	};

	function timeAgo(date: Date): string {
		const s = Math.floor((Date.now() - date.getTime()) / 1000);
		if (s < 60) return 'just now';
		if (s < 3600) return `${Math.floor(s / 60)}m ago`;
		if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
		return `${Math.floor(s / 86400)}d ago`;
	}

	function seekingLabel(ids: string[]): string {
		if (ids.length === 0) return 'Anyone';
		const labels = ids.map((id) => IDENTITY_PLURAL[id] ?? IDENTITY_LABELS[id] ?? id);
		return labels.join(' / ');
	}

	const href = $derived(resolve(`/listings/${listing.id}`));
</script>

{#if compact}
	<a {href} class="row-link">
		<div class="listing-row">
			<div class="row-body">
				<div class="row-top">
					{#if listing.trustTier !== 'new'}
						<span
							class="trust trust-{listing.trustTier}"
							title={TRUST_TITLES[listing.trustTier]}
							aria-label={TRUST_TITLES[listing.trustTier]}
						>
							{#if listing.trustTier === 'trusted'}
								<svg viewBox="0 0 18 18" aria-hidden="true"
									><path
										d="M9 2L15 4.5V9C15 12.8 12.2 15.2 9 16.5C5.8 15.2 3 12.8 3 9V4.5L9 2Z"
										fill="currentColor"
									/><path
										d="M6 9.5L8 11.5L12 7"
										fill="none"
										stroke="white"
										stroke-width="1.8"
										stroke-linecap="round"
										stroke-linejoin="round"
									/></svg
								>
							{:else}
								<svg viewBox="0 0 18 18" aria-hidden="true"
									><path
										d="M9 2L15 4.5V9C15 12.8 12.2 15.2 9 16.5C5.8 15.2 3 12.8 3 9V4.5L9 2Z"
										fill="color-mix(in srgb, currentColor 15%, transparent)"
										stroke="currentColor"
										stroke-width="1.5"
									/></svg
								>
							{/if}
						</span>
					{/if}
					<span class="row-subject">{listing.subject}</span>
				</div>
				<p class="row-meta">
					{IDENTITY_LABELS[listing.identity]} · {listing.age} · Seeking {seekingLabel(
						listing.lookingFor
					)}
					· {listing.nature.map((n) => NATURE_LABELS[n] ?? n).join(', ')}
					{#if listing.mood}
						· {MOOD_LABELS[listing.mood] ?? listing.mood}{/if}
					· {listing.fuzzyLocation}
				</p>
			</div>
			<div class="row-aside">
				{#if listing.distance !== null}<span>~{listing.distance} mi</span>{/if}
				<span>{timeAgo(listing.postedAt)}</span>
			</div>
		</div>
	</a>
{:else}
	<a {href} class="card-link">
		<article class="listing-card">
			<div class="card-top">
				{#if listing.trustTier !== 'new'}
					<span
						class="trust trust-{listing.trustTier}"
						title={TRUST_TITLES[listing.trustTier]}
						aria-label={TRUST_TITLES[listing.trustTier]}
					>
						{#if listing.trustTier === 'trusted'}
							<svg viewBox="0 0 18 18" aria-hidden="true"
								><path
									d="M9 2L15 4.5V9C15 12.8 12.2 15.2 9 16.5C5.8 15.2 3 12.8 3 9V4.5L9 2Z"
									fill="currentColor"
								/><path
									d="M6 9.5L8 11.5L12 7"
									fill="none"
									stroke="white"
									stroke-width="1.8"
									stroke-linecap="round"
									stroke-linejoin="round"
								/></svg
							>
						{:else}
							<svg viewBox="0 0 18 18" aria-hidden="true"
								><path
									d="M9 2L15 4.5V9C15 12.8 12.2 15.2 9 16.5C5.8 15.2 3 12.8 3 9V4.5L9 2Z"
									fill="color-mix(in srgb, currentColor 15%, transparent)"
									stroke="currentColor"
									stroke-width="1.5"
								/></svg
							>
						{/if}
					</span>
				{/if}
				{#if listing.distance !== null}
					<span class="distance">~{listing.distance} mi</span>
				{/if}
			</div>

			<p class="subject">{listing.subject}</p>

			<p class="meta-primary">
				{IDENTITY_LABELS[listing.identity]} · {listing.age} · Seeking {seekingLabel(
					listing.lookingFor
				)}
			</p>

			<p class="meta-secondary">
				{listing.nature.map((n) => NATURE_LABELS[n] ?? n).join(' · ')}
				{#if listing.mood}
					· {MOOD_LABELS[listing.mood] ?? listing.mood}{/if}
				{#if listing.availability}
					· {AVAIL_LABELS[listing.availability] ?? listing.availability}{/if}
			</p>

			<div class="card-footer">
				<span>{listing.fuzzyLocation}</span>
				<span>{timeAgo(listing.postedAt)}</span>
			</div>
		</article>
	</a>
{/if}

<style>
	.card-link {
		display: block;
		text-decoration: none;
		color: inherit;
	}

	.listing-card {
		margin-bottom: 0;
		padding: 1rem 1.25rem;
		transition: border-color 0.15s;
		cursor: pointer;
	}

	.listing-card:hover {
		border-color: var(--pico-primary);
	}

	.card-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.trust {
		display: inline-flex;
		align-items: center;
		flex-shrink: 0;
	}

	.trust svg {
		width: 16px;
		height: 16px;
		display: block;
	}

	.trust-established {
		color: var(--pico-primary);
	}

	.trust-trusted {
		color: #16a34a;
	}

	.distance {
		font-size: 0.8rem;
		color: var(--pico-muted-color);
		margin-left: auto;
	}

	.subject {
		font-size: 0.975rem;
		font-weight: 600;
		color: var(--pico-color);
		margin-bottom: 0.3rem;
		line-height: 1.35;
	}

	.meta-primary {
		font-size: 0.825rem;
		color: var(--pico-muted-color);
		margin-bottom: 0.15rem;
	}

	.meta-secondary {
		font-size: 0.78rem;
		color: var(--pico-muted-color);
		margin-bottom: 0.6rem;
		opacity: 0.8;
	}

	.card-footer {
		display: flex;
		justify-content: space-between;
		font-size: 0.75rem;
		color: var(--pico-muted-color);
		border-top: 1px solid var(--pico-muted-border-color);
		padding-top: 0.6rem;
		opacity: 0.75;
	}

	/* ── List / compact view ── */
	.row-link {
		display: block;
		text-decoration: none;
		color: inherit;
		overflow: hidden;
	}

	.listing-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.65rem 1rem;
		border-bottom: 1px solid var(--pico-muted-border-color);
		transition: background 0.1s;
		overflow: hidden;
	}

	.listing-row:hover {
		background: var(--pico-card-background-color);
	}

	.row-body {
		flex: 1;
		min-width: 0;
		overflow: hidden;
	}

	.row-top {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.2rem;
		min-width: 0;
	}

	.row-subject {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--pico-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
	}

	.row-meta {
		font-size: 0.75rem;
		color: var(--pico-muted-color);
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		/* wrap on mobile, single line on desktop */
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
	}

	.row-aside {
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.15rem;
		font-size: 0.72rem;
		color: var(--pico-muted-color);
		white-space: nowrap;
	}

	@media (min-width: 768px) {
		.row-meta {
			-webkit-line-clamp: 1;
			white-space: nowrap;
		}
	}
</style>
