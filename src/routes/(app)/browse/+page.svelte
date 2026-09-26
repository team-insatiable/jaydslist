<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import ListingCard from '$lib/components/listings/ListingCard.svelte';
	import AppPageIntro from '$lib/components/AppPageIntro.svelte';

	let { data } = $props();

	let viewMode = $state<'card' | 'list'>('card');

	onMount(() => {
		viewMode = (localStorage.getItem('browse-view') as 'card' | 'list') ?? 'card';
	});

	function setView(mode: 'card' | 'list') {
		viewMode = mode;
		localStorage.setItem('browse-view', mode);
	}

	function setFilter(key: string, value: string) {
		const params = new SvelteURLSearchParams($page.url.searchParams);
		if (value === '' || value === 'all') {
			params.delete(key);
		} else {
			params.set(key, value);
		}
		goto(resolve(`/browse?${params}`), { replaceState: true, keepFocus: true });
	}

	type FeedItem =
		| { type: 'listing'; listing: (typeof data.listings)[0] }
		| { type: 'separator'; label: string };

	const todayStr = new Date().toDateString();
	const yesterdayStr = new Date(Date.now() - 86_400_000).toDateString();

	function dateLabel(date: Date): string {
		const ds = date.toDateString();
		if (ds === todayStr) return 'Today';
		if (ds === yesterdayStr) return 'Yesterday';
		return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
	}

	function buildFeed(listings: typeof data.listings): FeedItem[] {
		const items: FeedItem[] = [];
		let lastLabel = '';
		for (const listing of listings) {
			const label = dateLabel(listing.postedAt);
			if (label !== lastLabel) {
				items.push({ type: 'separator', label });
				lastLabel = label;
			}
			items.push({ type: 'listing', listing });
		}
		return items;
	}

	const feedItems = $derived(buildFeed(data.listings));
</script>

{#if data.gated}
	<div class="gate-wrap">
		<div class="gate-card">
			<h2>Complete your profile to browse</h2>
			<p>Before you can see listings, we need a couple things from you.</p>
			<ul>
				{#if data.missingIdentity}
					<li>Set your identity in <strong>About you</strong></li>
				{/if}
				{#if data.missingLocation}
					<li>Set your location so we know what's nearby</li>
				{/if}
			</ul>
			<a href={resolve('/profile')} role="button">Go to profile settings</a>
		</div>
	</div>
{:else}
	<AppPageIntro
		eyebrow="The local board / Personals"
		title="Someone worth a few words."
		description="Find your kind of connection. No swipe treadmill—just people nearby, saying what they're looking for."
	/>
	<div class="board-layout">
		<aside class="filter-rail" aria-label="Listing filters">
			<h2>Find your people</h2>
			<p class="rail-intro">A little closer to what you have in mind.</p>
			<div class="browse-controls">
				<select
					name="nature"
					aria-label="Nature of connection"
					value={data.natureFilter ?? 'all'}
					onchange={(e) => setFilter('nature', (e.currentTarget as HTMLSelectElement).value)}
				>
					<option value="all">All connections</option>
					<option value="dating">Dating</option>
					<option value="fwb">FWB</option>
					<option value="one_time">NSA</option>
					<option value="platonic">Platonic</option>
					<option value="open">Open to anything</option>
				</select>
				<select
					name="radius"
					aria-label="Radius"
					value={data.radius}
					onchange={(e) => setFilter('radius', (e.currentTarget as HTMLSelectElement).value)}
				>
					<option value={5}>5 miles</option>
					<option value={10}>10 miles</option>
					<option value={25}>25 miles</option>
					<option value={50}>50 miles</option>
					<option value={100}>100 miles</option>
				</select>
				<div class="view-toggle">
					<button
						class="toggle-btn"
						class:active={viewMode === 'card'}
						onclick={() => setView('card')}
						title="Card view"
						aria-label="Card view"
						aria-pressed={viewMode === 'card'}
					>
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
							<rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
						</svg>
					</button>
					<button
						class="toggle-btn"
						class:active={viewMode === 'list'}
						onclick={() => setView('list')}
						title="List view"
						aria-label="List view"
						aria-pressed={viewMode === 'list'}
					>
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line
								x1="3"
								y1="18"
								x2="21"
								y2="18"
							/>
						</svg>
					</button>
				</div>
			</div>
			<a class="post-invitation" href={resolve('/post')}
				>Put your words on the board <span aria-hidden="true">↗</span></a
			>
			<p class="privacy-caption">Nearby, not pinpointed. Your exact location stays private.</p>
		</aside>
		<section class="board-results" aria-label="Nearby listings">
			<div class="board-summary">
				<span>{data.listings.length} listing{data.listings.length === 1 ? '' : 's'}</span><span
					>Within {data.radius} miles</span
				>
			</div>

			{#if data.listings.length === 0}
				<div class="empty">
					<h2>A fresh page.</h2>
					<p>
						No listings here just yet. Try a wider radius—or be the first to start a connection.
					</p>
					<a href={resolve('/post')}>Write a listing →</a>
				</div>
			{:else}
				<div class="listing-feed" class:list-mode={viewMode === 'list'}>
					{#each feedItems as item (item.type === 'listing' ? item.listing.id : item.label)}
						{#if item.type === 'separator'}
							<div class="date-separator" class:list-sep={viewMode === 'list'}>
								<span>{item.label}</span>
							</div>
						{:else}
							<ListingCard listing={item.listing} compact={viewMode === 'list'} />
						{/if}
					{/each}
				</div>
			{/if}
		</section>
	</div>
{/if}

<style>
	.board-layout {
		display: grid;
		grid-template-columns: 220px minmax(0, 1fr);
		gap: 2.5rem;
		align-items: start;
	}
	.filter-rail {
		position: sticky;
		top: 6rem;
		padding-top: 0.4rem;
	}
	.filter-rail h2 {
		font-family: Georgia, serif;
		font-size: 1.45rem;
		font-weight: 500;
	}
	.rail-intro,
	.privacy-caption {
		font-size: 0.8rem;
		line-height: 1.7;
		color: var(--pico-muted-color);
		margin: 0.7rem 0 1.5rem;
	}
	.post-invitation {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		margin-top: 2rem;
		padding-top: 1.25rem;
		border-top: 1px solid var(--pico-muted-border-color);
		font-size: 0.85rem;
		font-weight: 700;
	}
	.board-summary {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		padding: 0.5rem 0 1rem;
		border-bottom: 1px solid var(--pico-muted-border-color);
	}
	.board-summary span:last-child {
		color: var(--pico-muted-color);
	}
	@media (max-width: 800px) {
		.board-layout {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}
		.filter-rail {
			position: static;
		}
		.rail-intro,
		.privacy-caption,
		.post-invitation {
			display: none;
		}
	}
	/* Gate */
	.gate-wrap {
		display: flex;
		justify-content: center;
		padding: 3rem 1rem;
	}

	.gate-card {
		max-width: 420px;
		width: 100%;
		background: var(--pico-card-background-color);
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 10px;
		padding: 2rem;
		text-align: center;
	}

	.gate-card h2 {
		font-size: 1.1rem;
		font-weight: 700;
		margin-bottom: 0.75rem;
	}

	.gate-card p {
		font-size: 0.9rem;
		color: var(--pico-muted-color);
		margin-bottom: 1rem;
	}

	.gate-card ul {
		text-align: left;
		font-size: 0.875rem;
		margin-bottom: 1.5rem;
		padding-left: 1.25rem;
	}

	.gate-card li {
		margin-bottom: 0.4rem;
	}

	.browse-controls {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: stretch;
		width: 100%;
	}

	.browse-controls .view-toggle {
		margin-left: auto;
	}

	.browse-controls select {
		width: 100%;
		font-size: 0.875rem;
		padding: 0.4rem 2rem 0.4rem 0.75rem;
	}

	/* Empty state */
	.empty {
		text-align: center;
		padding: 3rem 1rem;
		color: var(--pico-muted-color);
		font-size: 0.9rem;
	}

	/* Date separators */
	.date-separator {
		grid-column: 1 / -1;
		text-align: left;
		padding: 1.5rem 0 0.3rem;
		color: var(--pico-muted-color);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.04em;
	}

	.date-separator.list-sep {
		padding: 0.5rem 1rem;
		background: var(--pico-card-background-color);
		border-bottom: 1px solid var(--pico-muted-border-color);
	}

	/* View toggle */
	.view-toggle {
		display: flex;
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 6px;
		overflow: hidden;
	}

	.toggle-btn {
		background: none;
		border: none;
		border-radius: 0;
		padding: 0 0.6rem;
		color: var(--pico-muted-color);
		cursor: pointer;
		display: flex;
		align-items: center;
	}

	.toggle-btn:first-child {
		border-right: 1px solid var(--pico-muted-border-color);
	}

	.toggle-btn svg {
		width: 16px;
		height: 16px;
	}

	.toggle-btn.active {
		color: var(--pico-primary);
		background: color-mix(in srgb, var(--pico-primary) 10%, transparent);
	}

	/* Feed */
	.listing-feed {
		display: grid;
		gap: 1rem;
	}

	.listing-feed.list-mode {
		gap: 0;
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 8px;
		overflow: hidden;
	}

	.listing-feed.list-mode :global(a:nth-of-type(even) .listing-row) {
		background: color-mix(in srgb, var(--pico-muted-border-color) 30%, transparent);
	}

	@media (min-width: 1050px) {
		.listing-feed:not(.list-mode) {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	@media (max-width: 800px) {
		.browse-controls {
			margin-top: 1rem;
		}
		.browse-controls select {
			flex: 1;
			min-width: 110px;
		}
	}
</style>
