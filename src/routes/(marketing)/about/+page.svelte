<script lang="ts">
	import { resolve } from '$app/paths';

	let { data } = $props();

	const principles = [
		{
			title: 'Nothing important is paywalled',
			body: 'Browsing, posting, messaging, and exchanging contact info all work fully on the free tier. An optional supporter tier adds convenience — never a feature withheld to pressure you into paying.',
			icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`
		},
		{
			title: 'Real accounts only',
			body: "Phone-verified accounts only — no anonymous signups, no social login. New accounts are checked against a cross-platform reputation system so repeat bad actors can't just start fresh.",
			icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`
		},
		{
			title: "You're told why if a listing is suspended",
			body: 'You get an email with the actual reason and a path to fix it. No silent takedowns, no guessing what happened.',
			icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`
		},
		{
			title: 'Moderation with a real process',
			body: 'Reports are reviewed against defined categories. First-time violations get a warning — not an instant ban. The rules are the same for everyone.',
			icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3L4 9v12h6v-6h4v6h6V9z"/></svg>`
		},
		{
			title: 'Listings held to a standard of clarity',
			body: 'Vague terms like "cute" or "nearby" mean different things to different people. Posters define exactly what they mean, right in the listing — so nobody is left guessing.',
			icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`
		},
		{
			title: 'Open source and self-hostable',
			body: "The code is AGPL-licensed and public. If you don't trust how we run things, you can read exactly how it works — or run your own instance.",
			icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`
		}
	];
</script>

<svelte:head>
	<title>About — {data.instanceName}</title>
</svelte:head>

<main class="about-page">
	<section class="about-hero">
		<h1>About {data.instanceName}</h1>
		<p class="lead">
			When Craigslist personals disappeared, it left a gap that most replacements filled with ads,
			paywalls, and fake accounts. {data.instanceName} exists to try something different: a personals
			platform that's actually good at helping real people connect, without the extractive product decisions.
		</p>
	</section>

	<section class="principles">
		<div class="principle-grid">
			{#each principles as p (p.title)}
				<div class="principle-card">
					<div class="principle-icon">
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html p.icon}
					</div>
					<div>
						<h3>{p.title}</h3>
						<p>{p.body}</p>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<section class="about-footer-note">
		<p>
			We're not naive enough to claim this will be perfect — no platform can promise that. But we
			think a personals site can put in a genuine effort instead of treating users as a captive
			audience. That's the whole idea.
		</p>
		<a href={resolve('/rules')}>Read the Community Rules →</a>
	</section>
</main>

<style>
	.about-page {
		max-width: 860px;
		margin-inline: auto;
		padding: 0 1.5rem 5rem;
	}

	.about-hero {
		padding: 3.5rem 0 2.5rem;
		max-width: 640px;
	}

	.about-hero h1 {
		font-size: 2rem;
		font-weight: 800;
		letter-spacing: -0.02em;
		margin-bottom: 1rem;
	}

	.lead {
		font-size: 1.05rem;
		line-height: 1.7;
		color: var(--pico-muted-color);
		margin: 0;
	}

	.principles {
		margin-bottom: 3rem;
	}

	.principle-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.75rem;
	}

	@media (min-width: 640px) {
		.principle-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.principle-card {
		display: flex;
		gap: 1rem;
		padding: 1.375rem 1.25rem;
		background: var(--pico-card-background-color);
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 12px;
	}

	.principle-icon {
		flex-shrink: 0;
		width: 2.25rem;
		height: 2.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		background: color-mix(in srgb, var(--pico-primary) 12%, transparent);
		color: var(--pico-primary);
	}

	.principle-icon :global(svg) {
		width: 1.1rem;
		height: 1.1rem;
	}

	.principle-card h3 {
		font-size: 0.9375rem;
		font-weight: 700;
		margin-bottom: 0.3rem;
	}

	.principle-card p {
		font-size: 0.875rem;
		line-height: 1.6;
		color: var(--pico-muted-color);
		margin: 0;
	}

	.about-footer-note {
		padding: 1.75rem 1.5rem;
		background: color-mix(in srgb, var(--pico-primary) 5%, transparent);
		border: 1px solid color-mix(in srgb, var(--pico-primary) 15%, transparent);
		border-radius: 12px;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	@media (min-width: 640px) {
		.about-footer-note {
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
		}
	}

	.about-footer-note p {
		font-size: 0.9rem;
		line-height: 1.6;
		color: var(--pico-muted-color);
		margin: 0;
		max-width: 44rem;
	}

	.about-footer-note a {
		white-space: nowrap;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--pico-primary);
		text-decoration: none;
		flex-shrink: 0;
	}

	.about-footer-note a:hover {
		text-decoration: underline;
	}
</style>
