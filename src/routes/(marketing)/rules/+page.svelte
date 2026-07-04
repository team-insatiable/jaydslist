<script lang="ts">
	import { resolve } from '$app/paths';

	let { data } = $props();
</script>

<svelte:head>
	<title>Community Rules — {data.instanceName}</title>
</svelte:head>

<main class="legal-page">
	<h1>Community Rules</h1>
	<p class="intro">
		These are the practical, day-to-day rules for using {data.instanceName}. They're a friendlier
		summary of what's expected — the full legal terms are in our
		<a href={resolve('/terms')}>Terms of Use</a>, which always govern if the two ever conflict.
	</p>

	<h2>Be honest</h2>
	<ul>
		<li>Use real, current photos of yourself. Don't post someone else's photos as your own.</li>
		<li>Don't run more than one account, and don't impersonate anyone else.</li>
		<li>Represent your identity, physical type, and age accurately.</li>
	</ul>

	<h2>Be respectful</h2>
	<ul>
		<li>No harassment, threats, hate speech, or degrading comments.</li>
		<li>If someone declines or doesn't respond, respect it and move on.</li>
		<li>Respect people's stated hard and soft requirements — they're there for a reason.</li>
	</ul>

	<h2>No spam or low-effort messaging</h2>
	<ul>
		<li>No mass-messaging, copy-pasted openers, or one-word introductions.</li>
		<li>No advertising, solicitation, or promotion of another product or service.</li>
		<li>
			Messages need a minimum amount of real substance to send — this isn't meant to be a hurdle,
			just a filter against low-effort spam.
		</li>
	</ul>

	<h2>Respect privacy</h2>
	<ul>
		<li>
			Don't ask for or share someone else's contact info, address, or other identifying details
			outside of the key-exchange feature — it exists precisely so both sides consent before any of
			that is revealed.
		</li>
		<li>Don't screenshot or repost someone else's listing, messages, or photos elsewhere.</li>
	</ul>

	<h2>Follow the law</h2>
	<ul>
		<li>You must be 18 or older to use {data.instanceName}, no exceptions.</li>
		<li>
			No content that sexualizes or endangers minors in any way — this is an absolute,
			zero-tolerance rule with no gray area (see our <a href={resolve('/terms')}>Terms of Use</a> for
			how seriously this is enforced).
		</li>
		<li>No solicitation of prostitution, trafficking, or any commercial sex act.</li>
		<li>No illegal content or activity of any kind.</li>
	</ul>

	<h2>If you break a rule</h2>
	<p>
		Most first-time violations get a warning — you get one, for life. A confirmed second violation,
		or anything serious enough on its own (like content involving a minor), typically results in an
		immediate suspension or ban, without a further warning. Confirmed bans for serious violations
		(harassment, spam, fake profiles, unsolicited explicit content) are also reported to the DBBL
		Protocol, a cross-platform reputation system — see our <a href={resolve('/privacy')}
			>Privacy Policy</a
		> for details.
	</p>
	<p>
		If someone breaks these rules with you, report it. Reports are reviewed, not ignored, and we'd
		rather know about a problem than have you just leave.
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
		margin-bottom: 0.75rem;
	}

	.intro {
		color: var(--pico-muted-color);
		margin-bottom: 2rem;
	}

	.legal-page h2 {
		font-size: 1.15rem;
		margin-top: 2rem;
		margin-bottom: 0.75rem;
	}

	.legal-page p,
	.legal-page ul {
		font-size: 0.9rem;
		line-height: 1.65;
		color: var(--pico-color);
	}

	.legal-page ul {
		padding-left: 1.5rem;
	}

	.legal-page li {
		margin-bottom: 0.4rem;
	}
</style>
