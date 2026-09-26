<script lang="ts">
	import { resolve } from '$app/paths';
	import BetaLanding from '$lib/components/BetaLanding.svelte';
	import BrandMark from '$lib/components/BrandMark.svelte';

	let { data, form } = $props();

	const features = [
		{
			title: 'Privacy-first location',
			body: 'Radius-based search only — no map, no exact coordinates. You get a fuzzy area label and an approximate distance, never a pin on a map.'
		},
		{
			title: 'No free-for-all DMs',
			body: 'Messaging is tied to a specific listing. Neither side sees the other’s contact info until you both agree to a contact exchange.'
		},
		{
			title: 'Clear on vague terms',
			body: 'Words like “cute” or “nearby” mean different things to different people — posters define exactly what they mean, right in the listing.'
		},
		{
			title: 'Real people, verified',
			body: 'Phone-verified accounts only — no anonymous posting, no social login. Trust builds over time with account age and response rate.'
		}
	];

	const steps = [
		{ n: '1', text: 'Verify your phone and set a search radius' },
		{ n: '2', text: 'Post a listing or browse ones nearby' },
		{ n: '3', text: 'Exchange contact info only once you both agree' }
	];
</script>

<svelte:head>
	<title>{data.instanceName}</title>
	<meta name="description" content={data.instanceTagline} />
</svelte:head>

{#if data.prelaunchMode}
	<BetaLanding name={data.instanceName} submitted={form?.submitted} error={form?.error} />
{:else}
	<main class="landing-page">
		<section class="hero">
			<p class="eyebrow">Old-school personals. New-school standards.</p>
			<div class="hero-logo"><BrandMark size={72} /></div>
			<h1>{data.instanceName}</h1>
			<p class="tagline">{data.instanceTagline}</p>
			<p class="subhead">
				The spirit of Craigslist personals, with better boundaries. No ads. Free posting and
				messaging. Open source.
			</p>
			<div class="hero-cta">
				<a href={resolve('/register')} class="cta-primary">Create free account</a>
				<a href={resolve('/login')} class="cta-secondary">Sign in</a>
			</div>
			<p class="hero-note">For adults 18+ · Phone verification keeps the community grounded</p>
		</section>

		<section class="features">
			<div class="feature-grid">
				{#each features as f (f.title)}
					<div class="feature-card">
						<span class="feature-mark" aria-hidden="true"></span>
						<h3>{f.title}</h3>
						<p>{f.body}</p>
					</div>
				{/each}
			</div>
		</section>

		<section class="how-it-works">
			<h2>How it works</h2>
			<div class="steps">
				{#each steps as step (step.n)}
					<div class="step">
						<span class="step-num">{step.n}</span>
						<p>{step.text}</p>
					</div>
				{/each}
			</div>
		</section>

		<section class="monetization">
			<p>
				No ads. Every core feature works fully on the free tier. If you'd like to support the
				project, an optional pay-what-you-want supporter tier is available — never required.
			</p>
		</section>
	</main>
{/if}

<style>
	.landing-page {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.hero {
		position: relative;
		isolation: isolate;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: 4.75rem 1.5rem 3.5rem;
		background:
			radial-gradient(
				circle at 50% 0%,
				color-mix(in srgb, var(--pico-primary) 14%, transparent),
				transparent 50%
			),
			linear-gradient(
				to bottom,
				color-mix(in srgb, var(--pico-primary) 4%, transparent),
				transparent
			);
	}

	.hero::after {
		content: '';
		position: absolute;
		inset: auto 15% 0;
		height: 1px;
		background: linear-gradient(90deg, transparent, var(--pico-muted-border-color), transparent);
		z-index: -1;
	}

	.eyebrow {
		margin-bottom: 1rem;
		color: var(--pico-primary);
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.hero-logo {
		width: 72px;
		height: 72px;
		color: var(--pico-primary);
		margin-bottom: 1.25rem;
		filter: drop-shadow(0 12px 18px color-mix(in srgb, var(--pico-primary) 25%, transparent));
		animation: logo-arrive 500ms ease-out both;
	}

	.hero h1 {
		font-size: clamp(2.75rem, 6vw, 3.5rem);
		font-weight: 800;
		letter-spacing: -0.03em;
		margin-bottom: 0.4rem;
		animation: rise-in 500ms 80ms ease-out both;
	}

	.tagline {
		font-size: 1.25rem;
		color: var(--pico-primary);
		font-weight: 600;
		margin-bottom: 0.75rem;
	}

	.subhead {
		font-size: 1.1rem;
		color: var(--pico-muted-color);
		max-width: 32rem;
		margin-bottom: 2rem;
		line-height: 1.65;
		animation: rise-in 500ms 150ms ease-out both;
	}

	.hero-cta {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		justify-content: center;
		animation: rise-in 500ms 220ms ease-out both;
	}

	.cta-primary,
	.cta-secondary {
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-weight: 600;
		font-size: 0.95rem;
		text-decoration: none;
	}

	.cta-primary {
		background: var(--pico-primary);
		color: #fff;
		box-shadow: 0 8px 20px color-mix(in srgb, var(--pico-primary) 28%, transparent);
		transition:
			transform 0.15s,
			background 0.15s,
			box-shadow 0.15s;
	}

	.cta-primary:hover {
		background: var(--pico-primary-hover);
		color: #fff;
		text-decoration: none;
		transform: translateY(-2px);
		box-shadow: 0 12px 24px color-mix(in srgb, var(--pico-primary) 32%, transparent);
	}

	.cta-secondary {
		border: 1px solid var(--pico-muted-border-color);
		color: var(--pico-color);
		transition:
			border-color 0.15s,
			color 0.15s;
	}

	.cta-secondary:hover {
		border-color: var(--pico-primary);
		color: var(--pico-primary);
		text-decoration: none;
	}

	.hero-note {
		margin-top: 1.25rem;
		color: var(--pico-muted-color);
		font-size: 0.8rem;
	}

	.features {
		padding: 1rem 1.5rem 3rem;
		max-width: 1100px;
		margin-inline: auto;
		width: 100%;
		box-sizing: border-box;
	}

	.feature-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
	}

	@media (min-width: 640px) {
		.feature-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (min-width: 1024px) {
		.feature-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	.feature-card {
		position: relative;
		background: var(--pico-card-background-color);
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 1px 0 color-mix(in srgb, #fff 8%, transparent);
		transition:
			transform 0.18s ease,
			border-color 0.18s ease,
			box-shadow 0.18s ease;
	}

	.feature-card:hover {
		transform: translateY(-3px);
		border-color: color-mix(in srgb, var(--pico-primary) 38%, var(--pico-muted-border-color));
		box-shadow: 0 12px 26px rgba(0, 0, 0, 0.08);
	}

	.feature-mark {
		display: block;
		width: 1.85rem;
		height: 0.3rem;
		margin-bottom: 1rem;
		border-radius: 999px;
		background: linear-gradient(
			90deg,
			var(--pico-primary),
			color-mix(in srgb, var(--pico-primary) 25%, transparent)
		);
	}

	.feature-card h3 {
		font-size: 1.125rem;
		margin-bottom: 0.5rem;
	}

	.feature-card p {
		font-size: 0.975rem;
		color: var(--pico-muted-color);
		margin: 0;
	}

	.how-it-works {
		padding: 2rem 1.5rem 3rem;
		max-width: 1100px;
		margin-inline: auto;
		width: 100%;
		box-sizing: border-box;
		text-align: center;
	}

	.how-it-works h2 {
		font-size: 1.5rem;
		margin-bottom: 2rem;
	}

	.steps {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.5rem;
	}

	@media (min-width: 768px) {
		.steps {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.step {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.step-num {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--pico-primary) 15%, transparent);
		color: var(--pico-primary);
		font-weight: 700;
	}

	.step p {
		margin: 0;
		font-size: 0.975rem;
		max-width: 16rem;
	}

	.monetization {
		padding: 2rem 1.5rem;
		background: color-mix(in srgb, var(--pico-primary) 6%, transparent);
		border-top: 1px solid var(--pico-muted-border-color);
		border-bottom: 1px solid var(--pico-muted-border-color);
		text-align: center;
	}

	.monetization p {
		max-width: 36rem;
		margin: 0 auto;
		font-size: 0.975rem;
		color: var(--pico-muted-color);
	}

	@keyframes logo-arrive {
		from {
			opacity: 0;
			transform: scale(0.88) rotate(-4deg);
		}
		to {
			opacity: 1;
			transform: scale(1) rotate(0);
		}
	}

	@keyframes rise-in {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.hero-logo,
		.hero h1,
		.subhead,
		.hero-cta {
			animation: none;
		}
		.feature-card,
		.cta-primary {
			transition: none;
		}
	}
</style>
