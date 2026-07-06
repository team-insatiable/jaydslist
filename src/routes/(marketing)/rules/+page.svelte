<script lang="ts">
	import { resolve } from '$app/paths';

	let { data } = $props();

	const sections = [
		{
			title: 'Be honest',
			icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
			rules: [
				"Use real, current photos of yourself. Don't post someone else's photos as your own.",
				"Don't run more than one account, and don't impersonate anyone else.",
				'Represent your identity, physical type, and age accurately.'
			]
		},
		{
			title: 'Be respectful',
			icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
			rules: [
				'No harassment, threats, hate speech, or degrading comments.',
				"If someone declines or doesn't respond, respect it and move on.",
				"Respect people's stated requirements — they're there for a reason."
			]
		},
		{
			title: 'No spam or low-effort messaging',
			icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="10" x2="15" y2="10"/></svg>`,
			rules: [
				'No mass-messaging, copy-pasted openers, or one-word introductions.',
				'No advertising, solicitation, or promotion of another product or service.',
				'Messages need a minimum amount of real substance — not a hurdle, just a filter against spam.'
			]
		},
		{
			title: 'Respect privacy',
			icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
			rules: [
				"Don't ask for or share contact info outside of the key-exchange feature — it exists so both sides consent before anything is revealed.",
				"Don't screenshot or repost someone else's listing, messages, or photos elsewhere."
			]
		},
		{
			title: 'Follow the law',
			icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22V2"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
			rules: [
				`You must be 18 or older to use ${data.instanceName}, no exceptions.`,
				'No content that sexualizes or endangers minors in any way — zero-tolerance, no gray area.',
				'No solicitation of prostitution, trafficking, or any commercial sex act.',
				'No illegal content or activity of any kind.'
			]
		}
	];
</script>

<svelte:head>
	<title>Community Rules — {data.instanceName}</title>
</svelte:head>

<main class="rules-page">
	<section class="rules-hero">
		<h1>Community Rules</h1>
		<p class="lead">
			The practical, day-to-day expectations for using {data.instanceName}. The full legal terms are
			in our <a href={resolve('/terms')}>Terms of Use</a>, which govern if there's ever a conflict.
		</p>
	</section>

	<div class="rules-grid">
		{#each sections as section (section.title)}
			<div class="rule-card">
				<div class="rule-card-header">
					<div class="rule-icon">
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html section.icon}
					</div>
					<h2>{section.title}</h2>
				</div>
				<ul>
					{#each section.rules as rule, i (i)}
						<li>{rule}</li>
					{/each}
				</ul>
			</div>
		{/each}
	</div>

	<div class="enforcement-card">
		<h2>If you break a rule</h2>
		<div class="enforcement-body">
			<p>
				Most first-time violations get a warning — one, for life. A confirmed second violation, or
				anything serious enough on its own (like content involving a minor), typically results in an
				immediate suspension or ban with no further warning.
			</p>
			<p>
				Confirmed bans for serious violations are reported to the <strong>DBBL Protocol</strong>, a
				cross-platform reputation system — see our <a href={resolve('/privacy')}>Privacy Policy</a> for
				details.
			</p>
			<p class="report-cta">
				If someone breaks these rules with you, report it. Reports are reviewed, not ignored.
			</p>
		</div>
	</div>
</main>

<style>
	.rules-page {
		max-width: 860px;
		margin-inline: auto;
		padding: 0 1.5rem 5rem;
	}

	.rules-hero {
		padding: 3.5rem 0 2.5rem;
		max-width: 600px;
	}

	.rules-hero h1 {
		font-size: 2rem;
		font-weight: 800;
		letter-spacing: -0.02em;
		margin-bottom: 1rem;
	}

	.lead {
		font-size: 1rem;
		line-height: 1.7;
		color: var(--pico-muted-color);
		margin: 0;
	}

	.lead a {
		color: var(--pico-primary);
	}

	.rules-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	@media (min-width: 640px) {
		.rules-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.rule-card {
		background: var(--pico-card-background-color);
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 12px;
		padding: 1.375rem 1.25rem;
	}

	.rule-card-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.rule-icon {
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

	.rule-icon :global(svg) {
		width: 1.1rem;
		height: 1.1rem;
	}

	.rule-card h2 {
		font-size: 0.9375rem;
		font-weight: 700;
		margin: 0;
	}

	.rule-card ul {
		margin: 0;
		padding-left: 1.125rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.rule-card li {
		font-size: 0.875rem;
		line-height: 1.55;
		color: var(--pico-muted-color);
	}

	.enforcement-card {
		background: var(--pico-card-background-color);
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 12px;
		padding: 1.5rem 1.25rem;
	}

	.enforcement-card h2 {
		font-size: 0.9375rem;
		font-weight: 700;
		margin-bottom: 1rem;
	}

	.enforcement-body {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.enforcement-body p {
		font-size: 0.875rem;
		line-height: 1.6;
		color: var(--pico-muted-color);
		margin: 0;
	}

	.enforcement-body a {
		color: var(--pico-primary);
	}

	.report-cta {
		font-weight: 600;
		color: var(--pico-color) !important;
	}
</style>
