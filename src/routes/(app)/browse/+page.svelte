<script lang="ts">
	import { onMount } from 'svelte';
	import ListingCard from '$lib/components/listings/ListingCard.svelte';
	import type { Listing } from '$lib/components/listings/ListingCard.svelte';

	let viewMode = $state<'card' | 'list'>('card');

	onMount(() => {
		viewMode = (localStorage.getItem('browse-view') as 'card' | 'list') ?? 'card';
	});

	function setView(mode: 'card' | 'list') {
		viewMode = mode;
		localStorage.setItem('browse-view', mode);
	}

	type FeedItem =
		| { type: 'listing'; listing: Listing }
		| { type: 'separator'; label: string };

	const todayStr = new Date().toDateString();
	const yesterdayStr = new Date(Date.now() - 86_400_000).toDateString();

	function dateLabel(date: Date): string {
		const ds = date.toDateString();
		if (ds === todayStr) return 'Today';
		if (ds === yesterdayStr) return 'Yesterday';
		return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
	}

	function buildFeed(listings: Listing[]): FeedItem[] {
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

	const now = Date.now();
	const minsAgo = (n: number) => new Date(now - n * 60 * 1000);
	const hoursAgo = (n: number) => new Date(now - n * 60 * 60 * 1000);
	const daysAgo = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000);

	const listings: Listing[] = [
		{
			id: '1',
			subject: 'Tired of apps, looking for something real',
			identity: 'woman',
			age: 29,
			lookingFor: ['man'],
			nature: ['dating', 'open'],
			mood: 'coffee_first',
			availability: 'available_weekend',
			trustTier: 'established',
			fuzzyLocation: 'NE Phoenix area',
			distance: 4,
			postedAt: minsAgo(18)
		},
		{
			id: '2',
			subject: 'Night owl looking for company',
			identity: 'man',
			age: 34,
			lookingFor: ['woman'],
			nature: ['fwb', 'one_time'],
			mood: 'netflix_chill',
			availability: 'available_now',
			trustTier: 'trusted',
			fuzzyLocation: 'Central Scottsdale',
			distance: 11,
			postedAt: minsAgo(34)
		},
		{
			id: '3',
			subject: 'Down to earth, looking for a genuine connection',
			identity: 'woman',
			age: 41,
			lookingFor: ['man'],
			nature: ['dating'],
			mood: 'dinner_date',
			availability: 'available_weekend',
			trustTier: 'trusted',
			fuzzyLocation: 'Tempe area',
			distance: 7,
			postedAt: minsAgo(52)
		},
		{
			id: '4',
			subject: 'Strictly platonic, new in town and need friends',
			identity: 'non_binary',
			age: 26,
			lookingFor: ['man', 'woman', 'non_binary'],
			nature: ['platonic'],
			mood: 'just_browsing',
			availability: 'flexible',
			trustTier: 'new',
			fuzzyLocation: 'West Valley area',
			distance: 18,
			postedAt: hoursAgo(1)
		},
		{
			id: '5',
			subject: "You bring the wine, I'll handle the rest",
			identity: 'woman',
			age: 33,
			lookingFor: ['man'],
			nature: ['fwb', 'one_time'],
			mood: 'ready_now',
			availability: 'available_today',
			trustTier: 'established',
			fuzzyLocation: 'Downtown Phoenix',
			distance: 2,
			postedAt: hoursAgo(1)
		},
		{
			id: '6',
			subject: 'Looking for my person, no rush about it',
			identity: 'transgender_woman',
			age: 32,
			lookingFor: ['man'],
			nature: ['dating', 'open'],
			mood: 'coffee_first',
			availability: 'flexible',
			trustTier: 'established',
			fuzzyLocation: 'East Mesa area',
			distance: 14,
			postedAt: hoursAgo(2)
		},
		{
			id: '7',
			subject: 'Spontaneous weekend plans with the right person',
			identity: 'woman',
			age: 35,
			lookingFor: ['woman'],
			nature: ['fwb', 'open'],
			mood: 'netflix_chill',
			availability: 'available_weekend',
			trustTier: 'trusted',
			fuzzyLocation: 'Chandler area',
			distance: 9,
			postedAt: hoursAgo(3)
		},
		{
			id: '8',
			subject: 'Dinner dates and good conversation, nothing casual',
			identity: 'man',
			age: 45,
			lookingFor: ['woman'],
			nature: ['dating'],
			mood: 'dinner_date',
			availability: 'available_weekend',
			trustTier: 'trusted',
			fuzzyLocation: 'N Scottsdale area',
			distance: 16,
			postedAt: hoursAgo(4)
		},
		{
			id: '9',
			subject: "Skip the small talk, let's just hang",
			identity: 'man',
			age: 28,
			lookingFor: ['woman'],
			nature: ['fwb', 'one_time'],
			mood: 'ready_now',
			availability: 'available_now',
			trustTier: 'new',
			fuzzyLocation: 'Tempe near ASU',
			distance: 6,
			postedAt: hoursAgo(5)
		},
		{
			id: '10',
			subject: 'Coffee dates first, see where things go',
			identity: 'man',
			age: 31,
			lookingFor: ['woman'],
			nature: ['dating', 'fwb'],
			mood: 'coffee_first',
			availability: 'available_weekend',
			trustTier: 'established',
			fuzzyLocation: 'Gilbert area',
			distance: 12,
			postedAt: hoursAgo(6)
		},
		{
			id: '11',
			subject: 'Cozy nights in, open to something ongoing',
			identity: 'woman',
			age: 38,
			lookingFor: ['man'],
			nature: ['fwb', 'open'],
			mood: 'netflix_chill',
			availability: 'flexible',
			trustTier: 'established',
			fuzzyLocation: 'Ahwatukee area',
			distance: 10,
			postedAt: hoursAgo(8)
		},
		{
			id: '12',
			subject: 'Open-minded, no labels, just vibes',
			identity: 'man',
			age: 27,
			lookingFor: ['woman', 'non_binary'],
			nature: ['fwb', 'open'],
			mood: 'ready_now',
			availability: 'available_today',
			trustTier: 'new',
			fuzzyLocation: 'West Mesa area',
			distance: 8,
			postedAt: hoursAgo(9)
		},
		{
			id: '13',
			subject: 'Looking for something low-key and honest',
			identity: 'woman',
			age: 44,
			lookingFor: ['man'],
			nature: ['dating', 'open'],
			mood: 'dinner_date',
			availability: 'available_weekend',
			trustTier: 'trusted',
			fuzzyLocation: 'Paradise Valley area',
			distance: 13,
			postedAt: hoursAgo(11)
		},
		{
			id: '14',
			subject: 'Queer and looking for genuine platonic connection',
			identity: 'non_binary',
			age: 30,
			lookingFor: ['non_binary', 'woman'],
			nature: ['platonic', 'open'],
			mood: 'coffee_first',
			availability: 'flexible',
			trustTier: 'established',
			fuzzyLocation: 'Midtown Phoenix',
			distance: 3,
			postedAt: hoursAgo(14)
		},
		{
			id: '15',
			subject: 'Active lifestyle, looking for someone who keeps up',
			identity: 'man',
			age: 36,
			lookingFor: ['woman'],
			nature: ['dating', 'fwb'],
			mood: 'coffee_first',
			availability: 'available_weekend',
			trustTier: 'established',
			fuzzyLocation: 'Peoria area',
			distance: 21,
			postedAt: daysAgo(1)
		},
		{
			id: '16',
			subject: 'Just browsing for now, open if something feels right',
			identity: 'woman',
			age: 22,
			lookingFor: ['man', 'woman'],
			nature: ['open'],
			mood: 'just_browsing',
			availability: 'flexible',
			trustTier: 'new',
			fuzzyLocation: 'Glendale area',
			distance: 19,
			postedAt: daysAgo(1)
		},
		{
			id: '17',
			subject: 'Mature, stable, looking for the same',
			identity: 'man',
			age: 52,
			lookingFor: ['woman'],
			nature: ['dating'],
			mood: 'dinner_date',
			availability: 'available_weekend',
			trustTier: 'trusted',
			fuzzyLocation: 'Sun City area',
			distance: 24,
			postedAt: daysAgo(2)
		},
		{
			id: '18',
			subject: "Good energy, no drama, let's figure it out",
			identity: 'woman',
			age: 24,
			lookingFor: ['man'],
			nature: ['fwb', 'one_time'],
			mood: 'netflix_chill',
			availability: 'flexible',
			trustTier: 'new',
			fuzzyLocation: 'Fountain Hills area',
			distance: 23,
			postedAt: daysAgo(2)
		}
	];

	const feedItems = buildFeed(listings);
</script>

<div class="browse-header">
	<div>
		<h2>Casual Encounters</h2>
		<p class="subtitle">{listings.length} listings within 25 miles</p>
	</div>
	<div class="browse-controls">
		<select aria-label="Nature of connection">
			<option>All connections</option>
			<option>Dating</option>
			<option>FWB</option>
			<option>NSA</option>
			<option>Platonic</option>
		</select>
		<select aria-label="Radius">
			<option>25 miles</option>
			<option>5 miles</option>
			<option>10 miles</option>
			<option>50 miles</option>
			<option>100 miles</option>
		</select>
		<div class="view-toggle">
			<button
				class="toggle-btn"
				class:active={viewMode === 'card'}
				onclick={() => setView('card')}
				title="Card view"
				aria-label="Card view"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
					<rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
				</svg>
			</button>
			<button
				class="toggle-btn"
				class:active={viewMode === 'list'}
				onclick={() => setView('list')}
				title="List view"
				aria-label="List view"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
				</svg>
			</button>
		</div>
	</div>
</div>

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

<style>
	.browse-header {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
	}

	.browse-header h2 {
		margin-bottom: 0.1rem;
	}

	.subtitle {
		font-size: 0.875rem;
		color: var(--pico-muted-color);
		margin: 0;
	}

	.browse-controls {
		display: flex;
		gap: 0.75rem;
		align-items: stretch;
	}

	.browse-controls select {
		width: auto;
		font-size: 0.875rem;
		padding: 0.4rem 0.75rem;
	}

	.date-separator {
		grid-column: 1 / -1;
		text-align: center;
		padding: 0.6rem 0;
		color: var(--pico-muted-color);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.04em;
	}

	/* In list mode the separator sits inside the bordered container */
	.date-separator.list-sep {
		padding: 0.5rem 1rem;
		background: #1e293b;
		border-bottom: 1px solid #334155;
		color: #94a3b8;
	}

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

	/* Zebra striping — targets only <a> row-links, skipping <div> separators */
	.listing-feed.list-mode :global(a:nth-of-type(even) .listing-row) {
		background: color-mix(in srgb, var(--pico-muted-border-color) 30%, transparent);
	}

	@media (min-width: 768px) {
		.listing-feed:not(.list-mode) {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
