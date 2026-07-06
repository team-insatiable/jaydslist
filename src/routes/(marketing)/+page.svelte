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
			body: 'Messaging is tied to a specific listing. Neither side sees the other’s contact info until you both agree to a key exchange.'
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

<main>
	<section class="hero">
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
	</section>

	<section class="features">
		<div class="feature-grid">
			{#each features as f (f.title)}
				<div class="feature-card">
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
	main {
		display: flex;
		flex-direction: column;
	}

	.hero {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: 4rem 1.5rem 3rem;
	}

	.hero-logo {
		width: 72px;
		height: 72px;
		color: var(--pico-primary);
		margin-bottom: 1.25rem;
	}

	.hero h1 {
		font-size: 2.5rem;
		font-weight: 800;
		letter-spacing: -0.03em;
		margin-bottom: 0.4rem;
	}

	.tagline {
		font-size: 1.15rem;
		color: var(--pico-primary);
		font-weight: 600;
		margin-bottom: 0.75rem;
	}

	.subhead {
		font-size: 1rem;
		color: var(--pico-muted-color);
		max-width: 32rem;
		margin-bottom: 2rem;
	}

	.hero-cta {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		justify-content: center;
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
		transition: background 0.15s;
	}

	.cta-primary:hover {
		background: var(--pico-primary-hover);
		color: #fff;
		text-decoration: none;
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
		background: var(--pico-card-background-color);
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 12px;
		padding: 1.5rem;
	}

	.feature-card h3 {
		font-size: 1.05rem;
		margin-bottom: 0.5rem;
	}

	.feature-card p {
		font-size: 0.9rem;
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
		font-size: 0.9rem;
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
		font-size: 0.9rem;
		color: var(--pico-muted-color);
	}
</style>
