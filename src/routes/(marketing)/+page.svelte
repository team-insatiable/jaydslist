<script lang="ts">
	import { resolve } from '$app/paths';

	let { data } = $props();

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

<main class="landing-page">
	<section class="hero">
		<p class="eyebrow">A calmer way to connect</p>
		<svg
			class="hero-logo"
			viewBox="0 0 1024 1024"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
		>
			<rect width="1024" height="1024" rx="180" fill="currentColor" />
			<path
				fill="#F6F5F5"
				d="M438.581 273.823C474.776 273.984 511.263 277.35 545.425 290.917C672.598 341.375 712.401 500.863 666.16 620.4C643.85 678.075 605.291 716.638 549.125 741.191C531.968 748.032 514.23 752.242 496.053 755.3C466.814 760.22 436.743 758.566 407.138 758.526L321.043 758.503C325.64 754.78 331.742 750.104 335.907 746.061C352.164 730.282 365.924 710.929 373.72 689.615C384.377 660.478 383.471 632.859 383.339 602.453L383.035 546.33L383.138 418.123C383.149 406.412 383.172 394.4 383.027 382.786C382.76 361.497 383.766 342.399 397.359 324.954C408.65 310.462 421.156 306.908 438.599 304.786L438.581 273.823Z"
			/>
			<path
				fill="currentColor"
				d="M468.668 306.573C530.924 313.174 557.696 379.605 566.397 433.694C570.118 457.166 572.332 480.851 573.027 504.605C574.444 558.75 567.567 646.57 534.909 691.75C515.849 714.539 497.841 723.582 468.661 729.127C469.819 684.043 469.007 635.628 468.987 590.385L468.668 306.573Z"
			/>
			<path
				fill="#F6F5F5"
				d="M198.229 273.466L414.216 273.511C414.373 278.575 414.409 283.643 414.324 288.709C407.555 290.139 401.477 291.556 395.133 294.429C350.322 314.719 357.39 374.775 357.47 415.422L357.488 558.932L357.502 601.906C357.493 622.671 357.713 639.755 353.485 659.85C338.486 729.773 278.44 769.893 208.22 764.411C167.413 761.225 138.192 748.552 115.825 712.733C97.4125 680.579 102.225 627.03 133.676 604.231C147.913 593.91 162.15 590.141 179.576 592.739C194.942 595.03 208.523 601.972 218.164 614.355C231.358 634.778 232.99 660.106 217.996 680.152C208.787 693.829 181.589 694.885 180.725 713.992C179.301 744.317 222.39 744.003 238.814 729.777C259.98 711.443 259.217 677.752 259.268 652.191C259.296 638.301 259.388 624.5 259.423 610.659L259.556 483.704L259.463 399.486C259.491 362.911 265.491 309.736 220.398 296.076C213.1 293.865 205.892 293.637 198.333 293.125L198.229 273.466Z"
			/>
			<path
				fill="#F6F5F5"
				d="M596.492 273.733L725.422 273.643C751.035 273.666 777.843 273.069 803.325 273.684L803.407 293.069C786.399 294.603 769.188 299.313 757 311.734C736.452 332.674 739.489 365.063 739.499 391.582L739.495 467.519L739.522 732.505C767.174 732.76 798.616 726.984 822.308 712.482C851.286 694.744 873.761 666.105 885.435 634.302C891.377 618.112 895.837 597.984 899.897 581.064C906.082 581.08 912.268 581.057 918.453 580.997C918.396 616.858 916.984 652.281 915.955 688.125L913.646 758.038L586.609 758.209C595.222 751.831 605.104 746.495 613.513 739.861C752.694 630.052 747.797 379.432 593.929 284.501C587.701 280.658 581.093 277.412 574.589 274.135C581.891 274.065 589.192 273.931 596.492 273.733Z"
			/>
		</svg>
		<h1>{data.instanceName}</h1>
		<p class="tagline">{data.instanceTagline}</p>
		<p class="subhead">
			Privacy-first personals. No ads, no paywalled features, and it's open source.
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
			No ads. Every core feature works fully on the free tier. If you'd like to support the project,
			an optional pay-what-you-want supporter tier is available — never required.
		</p>
	</section>
</main>

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
