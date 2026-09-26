<script lang="ts">
	import { resolve } from '$app/paths';
	import BrandMark from '$lib/components/BrandMark.svelte';
	let {
		name,
		submitted = false,
		error
	}: { name: string; submitted?: boolean; error?: string } = $props();
</script>

<main class="beta-page">
	<nav class="masthead" aria-label="Landing page">
		<a class="wordmark" href={resolve('/')}>
			<BrandMark size={44} />
			<span>{name}<span class="edition">personals, reimagined</span></span>
		</a>
		<span class="beta-badge"><span aria-hidden="true"></span> Beta on the horizon</span>
	</nav>

	<section class="launch-hero" aria-labelledby="launch-title">
		<div class="hero-copy">
			<p class="kicker">Old-school personals. New-school standards.</p>
			<h1 id="launch-title">Less swiping.<br />More <em>“hey, you.”</em></h1>
			<p class="intro">
				Remember when meeting someone started with a few honest words? We’re bringing that back—with
				privacy, intention, and a little more humanity.
			</p>
			<p class="positioning">The spirit of Craigslist personals. Built for what comes next.</p>
			<form method="POST" action="?/joinBeta" id="join-beta">
				<label for="beta-email">Be there from the beginning.</label>
				<div class="signup-row">
					<input
						id="beta-email"
						name="email"
						type="email"
						autocomplete="email"
						placeholder="Your email address"
						required
					/>
					<button type="submit">Get beta updates <span aria-hidden="true">↗</span></button>
				</div>
				{#if submitted}<p class="feedback" role="status">
						You’re almost in. Check your inbox to confirm your email.
					</p>{/if}
				{#if error}<p class="feedback error" role="alert">{error}</p>{/if}
				<p class="fine-print">Beta &amp; launch updates only. Confirm by email. For adults 18+.</p>
			</form>
		</div>
		<div class="preview" aria-label="Illustration of a personals listing">
			<div class="preview-bar">
				<span>{name} / personals</span><span aria-hidden="true">↗</span>
			</div>
			<p class="sample-label">A little glimpse of the idea · fictional listing</p>
			<article class="listing">
				<div class="listing-meta"><span>coffee first</span><span>in your area</span></div>
				<h2>Good conversation.<br />Questionable coffee.</h2>
				<p>
					Looking for someone to trade stories with at that little place on the corner. No perfect
					opener needed. Just curiosity and a free Saturday.
				</p>
				<div class="listing-tags"><span>low pressure</span><span>real intentions</span></div>
				<div class="listing-reply">
					<span>Start with a conversation</span><span aria-hidden="true">→</span>
				</div>
			</article>
			<div class="privacy-note">
				<span aria-hidden="true">↳</span> Your exact location? That stays yours.
			</div>
			<div class="preview-stamp">Words first.<br />People always.</div>
		</div>
	</section>

	<div class="principle-strip" aria-label="Our principles">
		<span>No ads.</span><span>No swipe treadmill.</span><span>Core features stay free.</span><span
			>Open source.</span
		>
	</div>

	<section class="difference" aria-labelledby="difference-title">
		<div class="section-intro">
			<p class="kicker">A fresh start for personals</p>
			<h2 id="difference-title">A bulletin board.<br />With better boundaries.</h2>
			<p>A place to say what you want, find people nearby, and let a conversation do the rest.</p>
		</div>
		<div class="difference-grid">
			<article>
				<span class="feature-number">01 / Your words</span>
				<h3>Lead with intention.</h3>
				<p>
					Post a listing that says what you’re actually looking for. More context, less guessing,
					and no profile reduced to a swipe.
				</p>
			</article>
			<article>
				<span class="feature-number">02 / Your space</span>
				<h3>Nearby. Never pinpointed.</h3>
				<p>
					Find connections by distance without broadcasting your exact location. A neighborhood
					feeling, without the map pin.
				</p>
			</article>
			<article>
				<span class="feature-number">03 / Your choice</span>
				<h3>Contact is a mutual decision.</h3>
				<p>
					Conversations begin with a listing. Personal contact details stay private until both
					people agree to share them.
				</p>
			</article>
			<article>
				<span class="feature-number">04 / Our promise</span>
				<h3>A community, not an ad audience.</h3>
				<p>
					Phone verification before posting or messaging. Clear rules. Open-source code. Browsing,
					posting, and connecting stay free.
				</p>
			</article>
		</div>
	</section>

	<section class="closing">
		<p class="kicker">Help shape the next chapter</p>
		<h2>The internet could use<br />a little more connection.</h2>
		<p>We’re getting ready for beta. Join the list and be part of the beginning.</p>
		<a href="#join-beta">Count me in <span aria-hidden="true">↑</span></a>
	</section>
</main>

<style>
	.beta-page {
		--line: var(--pico-muted-border-color);
		max-width: 76rem;
		margin: auto;
		padding: 0 2.5rem;
	}
	.masthead {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 2rem 3rem 2rem 0;
		border-bottom: 1px solid var(--line);
		gap: 1rem;
	}
	.wordmark {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-width: 0;
		color: var(--pico-color);
		font-weight: 800;
		font-size: 1.6rem;
		letter-spacing: -0.05em;
		text-decoration: none;
	}
	.wordmark > span {
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.edition {
		display: block;
		font-size: 0.65rem;
		font-weight: 500;
		letter-spacing: 0.13em;
		text-transform: uppercase;
		margin-top: 0.25rem;
		color: var(--pico-muted-color);
	}
	.beta-badge {
		font-size: 0.75rem;
		color: var(--pico-muted-color);
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.beta-badge span {
		height: 0.45rem;
		width: 0.45rem;
		background: var(--pico-primary);
		border-radius: 50%;
	}
	.launch-hero {
		display: grid;
		grid-template-columns: 1.2fr 1fr;
		align-items: center;
		gap: 4rem;
		padding: 6rem 0 5rem;
	}
	.kicker {
		font-size: 0.7rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--pico-primary);
		font-weight: 700;
		margin-bottom: 1.4rem;
	}
	h1 {
		font-size: clamp(3.1rem, 5.9vw, 5.3rem);
		line-height: 1.04;
		letter-spacing: -0.065em;
		font-weight: 800;
	}
	h1 em {
		font-family: Georgia, serif;
		color: var(--pico-primary);
		font-weight: 400;
		letter-spacing: -0.055em;
	}
	.intro {
		max-width: 34rem;
		font-size: 1.13rem;
		line-height: 1.8;
		color: var(--pico-muted-color);
		margin-top: 1.8rem;
	}
	.positioning {
		font-size: 0.85rem;
		margin-top: 1rem;
		line-height: 1.6;
	}
	form {
		margin-top: 2rem;
		scroll-margin-top: 2rem;
	}
	label {
		font-weight: 700;
	}
	.signup-row {
		display: flex;
		gap: 0.5rem;
	}
	.signup-row input {
		margin: 0;
		min-width: 0;
	}
	button {
		white-space: nowrap;
		padding-inline: 1rem;
		font-size: 0.85rem;
	}
	.fine-print {
		font-size: 0.72rem;
		color: var(--pico-muted-color);
		margin-top: 0.7rem;
		line-height: 1.6;
	}
	.feedback {
		margin-top: 0.8rem;
		font-size: 0.9rem;
		color: var(--pico-primary);
	}
	.error {
		color: var(--pico-del-color);
	}
	.preview {
		position: relative;
		background: var(--pico-card-background-color);
		border: 1px solid var(--line);
		border-radius: 1rem;
		padding: 1.4rem;
		transform: rotate(2deg);
		box-shadow: 0 24px 70px rgba(0, 0, 0, 0.08);
	}
	.preview-bar {
		display: flex;
		justify-content: space-between;
		font-size: 0.75rem;
		font-weight: 700;
		border-bottom: 1px solid var(--line);
		padding-bottom: 1rem;
	}
	.sample-label {
		font-size: 0.65rem;
		color: var(--pico-muted-color);
		margin: 1rem 0;
	}
	.listing {
		padding: 1.5rem;
		border: 1px solid var(--line);
		border-radius: 0.5rem;
	}
	.listing-meta {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		color: var(--pico-primary);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-size: 0.6rem;
	}
	.listing h2 {
		font-family: Georgia, serif;
		font-size: 2rem;
		line-height: 1.2;
		font-weight: 400;
		margin-top: 1.4rem;
	}
	.listing p {
		color: var(--pico-muted-color);
		font-size: 0.9rem;
		line-height: 1.8;
		margin-top: 1rem;
	}
	.listing-tags {
		display: flex;
		gap: 0.5rem;
		margin-top: 1.3rem;
	}
	.listing-tags span {
		padding: 0.35rem 0.6rem;
		border: 1px solid var(--line);
		border-radius: 2rem;
		font-size: 0.65rem;
	}
	.listing-reply {
		display: flex;
		justify-content: space-between;
		border-top: 1px solid var(--line);
		padding-top: 1rem;
		margin-top: 1.5rem;
		font-size: 0.75rem;
		font-weight: 600;
	}
	.privacy-note {
		display: flex;
		gap: 0.7rem;
		font-size: 0.7rem;
		color: var(--pico-muted-color);
		padding-top: 1rem;
	}
	.preview-stamp {
		position: absolute;
		bottom: -1.7rem;
		right: -0.9rem;
		padding: 1rem 1.2rem;
		transform: rotate(-7deg);
		background: var(--pico-primary);
		color: white;
		font-size: 0.85rem;
		line-height: 1.4;
		font-weight: 700;
		border-radius: 0.4rem;
	}
	.principle-strip {
		display: flex;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 1rem;
		border-block: 1px solid var(--line);
		padding: 1.3rem 0;
		font-size: 0.85rem;
		font-weight: 700;
	}
	.difference {
		display: grid;
		grid-template-columns: 1fr 1.5fr;
		gap: 4rem;
		padding: 5rem 0;
	}
	.section-intro h2,
	.closing h2 {
		font-size: clamp(2rem, 3.5vw, 3rem);
		letter-spacing: -0.05em;
		line-height: 1.15;
	}
	.section-intro p:last-child {
		color: var(--pico-muted-color);
		line-height: 1.8;
		margin-top: 1.2rem;
	}
	.difference-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
	}
	.feature-number {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--pico-primary);
	}
	.difference-grid h3 {
		font-size: 1.05rem;
		margin: 0.8rem 0;
	}
	.difference-grid p {
		font-size: 0.9rem;
		line-height: 1.8;
		color: var(--pico-muted-color);
	}
	.closing {
		border-top: 1px solid var(--line);
		padding: 4rem 0;
		text-align: center;
	}
	.closing p:not(.kicker) {
		margin-top: 1.2rem;
		color: var(--pico-muted-color);
		line-height: 1.7;
	}
	.closing a {
		display: inline-flex;
		gap: 1rem;
		margin-top: 1.5rem;
		padding: 0.8rem 1.4rem;
		border: 1px solid var(--pico-primary);
		border-radius: 0.4rem;
		font-weight: 700;
	}
	@media (max-width: 900px) {
		.launch-hero {
			gap: 2rem;
		}
		.difference {
			gap: 2rem;
		}
		.signup-row {
			flex-direction: column;
		}
	}
	@media (max-width: 650px) {
		.beta-page {
			padding: 0 1.25rem;
		}
		.masthead {
			padding-top: 1.5rem;
			padding-right: 0;
			align-items: start;
			flex-wrap: wrap;
		}
		.beta-badge {
			margin-top: 0;
			font-size: 0.65rem;
		}
		.launch-hero {
			grid-template-columns: 1fr;
			padding: 3.5rem 0;
			gap: 3rem;
		}
		.preview {
			margin: 0 0.5rem 1.5rem;
		}
		.principle-strip {
			justify-content: start;
			font-size: 0.75rem;
			gap: 0.8rem 1.5rem;
		}
		.difference {
			grid-template-columns: 1fr;
			padding: 3rem 0;
		}
		.difference-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}
	}
</style>
