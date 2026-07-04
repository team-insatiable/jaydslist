<script lang="ts">
	import { resolve } from '$app/paths';

	let { data } = $props();
</script>

<svelte:head>
	<title>About — {data.instanceName}</title>
</svelte:head>

<main class="legal-page">
	<h1>About {data.instanceName}</h1>

	<p>
		When Craigslist personals disappeared, it left a real gap — a place for people to look for
		casual connections, dating, or just something in between, without the pretense of a swipe-based
		dating app. A handful of services have tried to fill that gap since. Most of them treat it
		purely as a monetization play: they lock basic functionality behind a paid tier, they do little
		to nothing about accounts that are obviously fake — sometimes glaringly so, just from looking at
		the photos — and they'll block a post or a message with no explanation and no way to find out
		why. The product experience is an afterthought. The goal is clearly to extract payment, not to
		build something people actually want to use.
	</p>

	<p>
		{data.instanceName} exists because we think that's backwards. A personals platform should actually
		try to be good at the one thing that matters: helping real people have real conversations, safely
		and without friction. So:
	</p>

	<ul>
		<li>
			<strong>Nothing important is paywalled.</strong> Browsing, posting, messaging, and exchanging contact
			info all work fully on the free tier. There's an optional, pay-what-you-want supporter tier, but
			it only adds convenience (extra simultaneous listings, faster bumping) — never a feature that's
			artificially withheld to pressure you into paying.
		</li>
		<li>
			<strong>We actually try to keep fake and bad-faith accounts out.</strong> Every account requires
			phone number verification — no anonymous signups, no social login. New and existing accounts are
			checked against a cross-platform reputation system so repeat bad actors banned elsewhere don't just
			show up here with a clean slate. It's not a perfect system, but it's a real one, not a checkbox.
		</li>
		<li>
			<strong>Moderation has actual categories and a real process</strong> — not an opaque black box.
			Reports are reviewed against defined violation types, and the platform uses a one-lifetime-warning
			policy rather than instant, unexplained bans for a first mistake.
		</li>
		<li>
			<strong>Listings are held to a basic standard of clarity.</strong> If you use a vague term like
			“cute” or “nearby” in your listing, you're asked to define what you actually mean — so responders
			aren't left guessing.
		</li>
		<li>
			<strong>The whole thing is open source (AGPL-licensed) and self-hostable.</strong> Nothing about
			how it works is hidden. If you don't trust how we run things, you're free to read the code, or run
			your own instance.
		</li>
	</ul>

	<p>
		We're not naive enough to claim we'll catch every bad actor or that this will be perfect — no
		platform can honestly promise that. But we think a personals site can put in a genuine effort
		instead of treating its users as a captive audience to monetize. That's the whole idea here.
	</p>

	<p>
		See our <a href={resolve('/rules')}>Community Rules</a> for the specifics of what's expected of everyone
		using the Service.
	</p>
</main>

<style>
	.legal-page {
		max-width: 720px;
		margin-inline: auto;
		padding: 3rem 1.5rem 4rem;
	}

	.legal-page h1 {
		font-size: 2rem;
		margin-bottom: 1.5rem;
	}

	.legal-page p,
	.legal-page ul {
		font-size: 0.95rem;
		line-height: 1.7;
		color: var(--pico-color);
	}

	.legal-page p {
		margin-bottom: 1.25rem;
	}

	.legal-page ul {
		padding-left: 1.5rem;
		margin-bottom: 1.25rem;
	}

	.legal-page li {
		margin-bottom: 0.75rem;
	}
</style>
