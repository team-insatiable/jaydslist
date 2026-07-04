<script lang="ts">
	import { resolve } from '$app/paths';

	let { data } = $props();

	const EFFECTIVE_DATE = 'July 4, 2026';
	const CONTACT_EMAIL = 'legal@jaydslist.com';
	const GOVERNING_STATE = 'California';
</script>

<svelte:head>
	<title>Terms of Use — {data.instanceName}</title>
</svelte:head>

<main class="legal-page">
	<h1>Terms of Use</h1>
	<p class="effective-date">Effective date: {EFFECTIVE_DATE}</p>

	<p>
		{data.instanceName} (“{data.instanceName}”, “we”, “us”, or “our”) operates {data.instanceUrl}
		(the “Service”). This is the default Terms of Use for the official instance of {data.instanceName}.
		{data.instanceName} is open-source software — if you are using a different, independently self-hosted
		deployment of it, these Terms may not apply; contact that instance's operator for their own terms.
	</p>

	<p>
		By accessing or using the Service, you agree to be bound by these Terms of Use and our <a
			href={resolve('/privacy')}>Privacy Policy</a
		>. If you do not agree, do not use the Service. We may modify these Terms at any time; continued
		use after a change means you accept the revised Terms. We'll try to flag material changes, but
		it's on you to check back periodically.
	</p>

	<h2>1. Eligibility</h2>
	<p>
		You must be at least 18 years old to use the Service, regardless of the age of majority where
		you live. By using the Service, you represent that you are 18 or older, capable of forming a
		binding contract, and not barred from using the Service under any applicable law. The Service
		requires phone number verification before you can post or message — we don't support anonymous
		accounts or social login.
	</p>

	<h2>2. Your Account</h2>
	<p>
		You're responsible for keeping your login credentials confidential and for all activity under
		your account. Notify us immediately at {CONTACT_EMAIL} if you suspect unauthorized access. We may
		suspend or terminate any account, at any time, for any reason or no reason, including suspected violations
		of these Terms.
	</p>
	<p>
		Accounts get one lifetime warning for a policy violation. A second confirmed violation typically
		results in suspension or a ban, without a further warning.
	</p>

	<h2>3. What This Service Is — and Isn't</h2>
	<p>
		{data.instanceName} is a personals platform for adults to connect with other adults. We verify phone
		numbers and check submitted phone numbers against a cross-platform reputation service (see our
		<a href={resolve('/privacy')}>Privacy Policy</a>
		for how that works), but we do <strong>not</strong> run criminal background checks, and we do not
		verify anyone's identity, health, age (beyond the phone check), or any other claim a user makes about
		themselves. You are solely responsible for the decisions you make about who you meet, communicate
		with, or share information with, both online and in person. Use your own judgment — meet in public
		first, tell a friend where you're going, and trust your instincts if something feels off.
	</p>
	<p>
		We are not responsible for the conduct of any user, on or off the Service, and we do not
		guarantee that any user's account, profile, or listing is authentic or accurate.
	</p>

	<h2>4. Content You Post</h2>
	<p>
		You keep ownership of anything you post — listings, messages, photos, and anything else you
		submit (“Your Content”). By posting Your Content, you grant us a non-exclusive, worldwide,
		royalty-free license to host, store, reproduce, display, and transmit Your Content solely as
		necessary to operate, maintain, and provide the Service to you and the users you interact with
		(for example, showing your listing to other users, delivering your messages to a thread, or
		storing a photo you attach). This license ends when Your Content is deleted from the Service,
		except for backup copies retained for a reasonable period and any snapshot of a listing already
		captured in an existing message thread (see Section 6).
	</p>
	<p>
		We do not sell Your Content, license it to advertisers, or use it to train third-party models.
		We do not run ads on the Service.
	</p>
	<p>You represent that:</p>
	<ul>
		<li>you have the right to post Your Content and to grant us the license above;</li>
		<li>Your Content doesn't infringe anyone else's rights;</li>
		<li>
			everyone depicted in any photo you post is an adult who consented to appearing in it; and
		</li>
		<li>Your Content complies with Section 5 below.</li>
	</ul>

	<h2>5. Content Rules</h2>
	<p>You may not post or send content that:</p>
	<ul>
		<li>sexualizes, exploits, or depicts a minor in any way, under any circumstances;</li>
		<li>is unlawful, threatening, harassing, or defamatory;</li>
		<li>constitutes or solicits prostitution, trafficking, or any commercial sex act;</li>
		<li>reveals someone else's personal information without their consent;</li>
		<li>impersonates another person or misrepresents your identity or age;</li>
		<li>is spam, mass-messaging, or an unsolicited advertisement;</li>
		<li>contains malware or is designed to disrupt the Service; or</li>
		<li>otherwise violates these Terms or applicable law.</li>
	</ul>
	<p>
		Messages are also subject to quality checks (minimum length, a low-effort/spam filter, and
		automated review) intended to keep the inbox genuine — posters never see messages that get
		blocked by these checks.
	</p>
	<p>
		We may remove any content, at any time, for any reason or no reason, without notice. We have no
		obligation to store, back up, or return Your Content once removed.
	</p>

	<h2>6. Messaging and Key Exchange</h2>
	<p>
		Messaging on the Service is tied to a specific listing — there is no free-form direct messaging.
		Neither party sees the other's verified contact information unless both sides opt in through the
		Service's key exchange feature. Either party can revoke a completed exchange at any time, which
		hides the shared information going forward (it does not undo anything the other person already
		saw or recorded).
	</p>
	<p>
		If a listing expires or is removed, its associated message threads keep a snapshot of the
		listing content as it existed at the time, so conversations remain readable. Removing a listing
		does not delete messages already sent in threads about it.
	</p>

	<h2>7. Zero Tolerance for Child Sexual Abuse Material</h2>
	<p>
		We have zero tolerance for content that sexually exploits or endangers minors in any way,
		including CSAM, grooming, sextortion, or content that sexualizes a real or fictional minor —
		even where a participant is later confirmed to be an adult roleplaying as a minor. Any account
		involved will be permanently banned and reported to the National Center for Missing & Exploited
		Children (NCMEC) and relevant law enforcement, as required by law. If you become aware of
		suspected CSAM anywhere on the Service, report it immediately to {CONTACT_EMAIL}.
	</p>

	<h2>8. Reporting, Moderation, and the DBBL Protocol</h2>
	<p>
		We rely on user reports and our own moderation to enforce these Terms. We may warn, suspend, or
		ban an account, and we may report confirmed policy violations — such as a confirmed ban for
		harassment, spam, or a fake profile — to <strong>the DBBL Protocol</strong>, an independent,
		cross-platform reputation service that other participating platforms also use to flag repeat bad
		actors. See our <a href={resolve('/privacy')}>Privacy Policy</a> for what we share and when.
	</p>
	<p>
		Moderation decisions are made at our sole discretion. We're not obligated to act on any report,
		and we don't promise a particular outcome, timeline, or explanation for any moderation action.
	</p>

	<h2>9. Trust Tiers</h2>
	<p>
		Accounts are placed into trust tiers (new, established, trusted) based on account age and
		response behavior, which affects things like daily messaging limits. Trust tier is not a
		verification of identity, safety, or trustworthiness in any real-world sense — it only reflects
		activity on the Service.
	</p>

	<h2>10. Free Tier and Supporter Tier</h2>
	<p>
		Every core feature of the Service — browsing, posting, messaging, and key exchange — is free and
		fully functional. We don't paywall core functionality and we don't run ads.
	</p>
	<p>
		We offer an optional, pay-what-you-want “Supporter” subscription (billed via Stripe) that adds
		perks like additional simultaneous listings, a shorter bump cooldown, and longer listing
		duration. Supporter subscriptions renew automatically at the interval you selected until you
		cancel. You can cancel anytime from your account settings; you'll keep supporter perks through
		the end of the period you already paid for, and we don't provide prorated refunds for the unused
		portion of a period except where required by law.
	</p>

	<h2>11. Intellectual Property</h2>
	<p>
		{data.instanceName}'s source code is open source (AGPL-licensed) and separately available under
		its own license terms on the project's public repository — these Terms don't change or limit
		that code license. Apart from the source code, the {data.instanceName} name, logo, and the non-code
		content of the Service (excluding Your Content) are owned by us or our licensors, and are not licensed
		to you beyond what's needed to use the Service normally.
	</p>

	<h2>12. Copyright (DMCA) Notices</h2>
	<p>
		If you believe content on the Service infringes your copyright, send a notice to {CONTACT_EMAIL}
		including: (1) a signature of the copyright owner or authorized agent; (2) identification of the copyrighted
		work; (3) identification of the infringing material and its location on the Service; (4) your contact
		information; (5) a statement of good-faith belief that the use is unauthorized; and (6) a statement,
		under penalty of perjury, that the notice is accurate and that you're authorized to act on the copyright
		owner's behalf. If your own content is removed following such a notice and you believe that was a
		mistake, you may send a counter-notice to the same address with a similar statement under penalty
		of perjury.
	</p>

	<h2>13. Disclaimers</h2>
	<p>
		THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE,” WITHOUT WARRANTIES OF ANY KIND, WHETHER
		EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
		OR NON-INFRINGEMENT. WE DON'T WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR
		SECURE, OR THAT ANY USER, PROFILE, OR CONTENT IS ACCURATE OR GENUINE.
	</p>

	<h2>14. Limitation of Liability</h2>
	<p>
		TO THE FULLEST EXTENT PERMITTED BY LAW, {data.instanceName} AND ITS OPERATORS WILL NOT BE LIABLE FOR
		ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF DATA, GOODWILL,
		OR PROFITS, ARISING FROM YOUR USE OF THE SERVICE OR YOUR INTERACTIONS WITH OTHER USERS. OUR TOTAL
		LIABILITY FOR ANY CLAIM RELATING TO THE SERVICE WILL NOT EXCEED THE GREATER OF (A) $100, OR (B) THE
		AMOUNT YOU PAID US IN THE 12 MONTHS BEFORE THE CLAIM AROSE.
	</p>

	<h2>15. Indemnification</h2>
	<p>
		You agree to defend and indemnify us against any claim arising from Your Content, your use of
		the Service, your violation of these Terms, or your violation of any law or third-party right.
	</p>

	<h2>16. Dispute Resolution and Arbitration</h2>
	<p>
		<strong
			>Please read this section carefully — it affects your legal rights, including your right to
			file a lawsuit in court.</strong
		>
	</p>
	<p>
		Except for small-claims-court matters and disputes about intellectual property, you and
		{data.instanceName} agree to resolve any dispute arising out of or relating to these Terms or the
		Service through binding, individual arbitration administered by JAMS under its applicable rules, rather
		than in court, with the arbitration seated in {GOVERNING_STATE}.
		<strong
			>You and {data.instanceName} each waive the right to a jury trial and the right to bring or participate
			in a class, collective, or representative action.</strong
		> If this class-action waiver is found unenforceable as to a particular claim, that claim (and only
		that claim) will proceed in court instead of arbitration.
	</p>

	<h2>17. Governing Law</h2>
	<p>
		These Terms are governed by the laws of the State of {GOVERNING_STATE}, without regard to
		conflict-of-law rules, except where arbitration rules under the Federal Arbitration Act apply
		instead.
	</p>

	<h2>18. General</h2>
	<p>
		If any provision of these Terms is found unenforceable, the rest remain in effect. Our failure
		to enforce a provision isn't a waiver of it. You may not assign your rights under these Terms;
		we may assign ours. These Terms, along with the Privacy Policy, are the entire agreement between
		you and us regarding the Service.
	</p>

	<h2>19. Contact</h2>
	<p>
		Questions about these Terms? Reach us at <a href="mailto:{CONTACT_EMAIL}">{CONTACT_EMAIL}</a>.
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
		margin-bottom: 0.25rem;
	}

	.effective-date {
		color: var(--pico-muted-color);
		font-size: 0.875rem;
		margin-bottom: 2rem;
	}

	.legal-page h2 {
		font-size: 1.15rem;
		margin-top: 2.25rem;
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
