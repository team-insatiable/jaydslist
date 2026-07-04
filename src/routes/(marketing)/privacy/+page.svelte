<script lang="ts">
	import { resolve } from '$app/paths';

	let { data } = $props();

	const EFFECTIVE_DATE = 'July 4, 2026';
	const CONTACT_EMAIL = 'legal@jaydslist.com';
</script>

<svelte:head>
	<title>Privacy Policy — {data.instanceName}</title>
</svelte:head>

<main class="legal-page">
	<h1>Privacy Policy</h1>
	<p class="effective-date">Effective date: {EFFECTIVE_DATE}</p>

	<p>
		This Privacy Policy explains what {data.instanceName} collects, why, and who we share it with. It's
		part of our <a href={resolve('/terms')}>Terms of Use</a> — by using the Service, you agree to
		both. {data.instanceName}
		is built to minimize what we collect and share in the first place: we don't run ads, we don't sell
		data, and we don't use third-party ad or analytics trackers.
	</p>

	<h2>1. What We Collect</h2>
	<ul>
		<li>
			<strong>Account info:</strong> your email address and password (stored as a salted hash, never in
			plain text).
		</li>
		<li>
			<strong>Phone number:</strong> collected to verify you're a real person and check for VoIP/virtual
			numbers. We normalize and SHA-256 hash your number before checking it against the DBBL Protocol
			(Section 3) — we do not store your raw phone number alongside your account beyond what's needed
			to complete verification.
		</li>
		<li>
			<strong>Location:</strong> your device's coordinates (via your browser's location permission), used
			only to compute an approximate distance and a fuzzy area label (like “NE Phoenix area”) for other
			users. Your precise coordinates are stored server-side and are never sent to, or visible by, other
			users or the client.
		</li>
		<li>
			<strong>Profile info:</strong> identity and physical-type selections, age, and any preferences you
			set.
		</li>
		<li>
			<strong>Content:</strong> listings, messages, and photos you submit. Photos are stored via Cloudflare
			Images; message and listing text is stored in our database.
		</li>
		<li>
			<strong>Usage and device data:</strong> IP address, browser/device type, and basic activity logs,
			used for security, abuse prevention, and debugging.
		</li>
		<li>
			<strong>Payment info (Supporter tier only):</strong> handled directly by Stripe — we don't store
			your full card number.
		</li>
	</ul>

	<h2>2. How We Use It</h2>
	<ul>
		<li>To operate core features — matching, messaging, distance labels, and moderation;</li>
		<li>To verify you're a real, adult, non-duplicate account;</li>
		<li>To detect and act on abuse, spam, and policy violations;</li>
		<li>
			To send account-related notifications (e.g. a new message, a moderation action on your
			account); and
		</li>
		<li>To process Supporter subscription payments.</li>
	</ul>
	<p>
		We do not use your data for interest-based or third-party advertising, because we don't run ads.
	</p>

	<h2>3. The DBBL Protocol (Cross-Platform Reputation Check)</h2>
	<p>
		The DBBL Protocol is an independent, cross-platform reputation service — think of it as a shared
		blocklist that participating personals/social platforms use to flag repeat bad actors, similar
		in spirit to an email spam list. We query it in two situations:
	</p>
	<ul>
		<li>
			<strong>At registration,</strong> after your phone number passes carrier verification, we send only
			the SHA-256 hash of your normalized phone number (never the raw number) and receive back a risk
			rating (clear, flagged, cautioned, restricted, or blacklisted).
		</li>
		<li>
			<strong>Before the first message in a new thread,</strong> we re-check in case a rating has worsened
			since registration.
		</li>
	</ul>
	<p>
		If your confirmed rating comes back “restricted” or “blacklisted,” we may deny registration or
		the action in question. A “cautioned” rating doesn't block you, but flags your account for
		closer internal review. We cache the result (rating, score, and check timestamp) on your
		account.
	</p>
	<p>
		Separately, if a moderator confirms a ban against your account for a serious violation
		(harassment, spam, a fake profile, unsolicited explicit content, or an unsolicited-DM pattern),
		we report that violation category to the DBBL Protocol so other participating platforms can see
		it too. We do not report anything about accounts that are merely reported, warned, or under
		review — only confirmed bans.
	</p>
	<p>
		If the DBBL Protocol check itself fails or is unreachable, we don't block you — an outage on our
		end or theirs never prevents you from using the Service. (A returned “restricted” or
		“blacklisted” rating still can, as described above.)
	</p>

	<h2>4. Who Else We Share Data With</h2>
	<p>
		We use a small number of infrastructure providers to run the Service, each of whom only receives
		what they need to perform their function and is contractually restricted from using your data
		for their own purposes:
	</p>
	<ul>
		<li><strong>Cloudflare</strong> — hosting, database, and photo storage/delivery.</li>
		<li><strong>Twilio</strong> — phone number verification and carrier/VoIP lookup.</li>
		<li><strong>Resend</strong> — transactional email (account and moderation notifications).</li>
		<li><strong>Stripe</strong> — Supporter tier payment processing.</li>
		<li><strong>The DBBL Protocol</strong> — as described in Section 3.</li>
	</ul>
	<p>
		We may also disclose information if required by law, subpoena, or valid legal process, or where
		necessary to investigate fraud, abuse, or a safety threat, or to enforce these policies. We do
		not sell your personal information to anyone, for any purpose.
	</p>

	<h2>5. What Other Users See</h2>
	<p>
		Other users never see your exact location, phone number, or email address. They see your listing
		content, your fuzzy location label, an approximate distance, and your trust tier. Your verified
		phone number and email are only revealed to another user if you both explicitly agree through
		the key-exchange feature, and only for as long as neither of you revokes it.
	</p>

	<h2>6. Data Retention and Deletion</h2>
	<p>
		We keep your data while your account is active. If you delete your account, we remove your
		profile and personal information within a reasonable period, except:
	</p>
	<ul>
		<li>
			message threads keep a snapshot of a listing's content even after the listing expires or is
			deleted, so conversations stay readable for the other participant;
		</li>
		<li>
			we may retain data we're required to keep for legal, security, or fraud-prevention purposes;
			and
		</li>
		<li>backup copies may persist for a limited period before being purged.</li>
	</ul>

	<h2>7. Security</h2>
	<p>
		We use industry-standard measures (encryption in transit, hashed passwords and phone numbers,
		access controls) to protect your data, but no online service is completely secure. Please use a
		strong, unique password and keep your account credentials confidential.
	</p>

	<h2>8. Children's Privacy</h2>
	<p>
		The Service is strictly for adults 18 and older. We do not knowingly collect data from anyone
		under 18. If we learn an account belongs to a minor, we will terminate it and delete associated
		data. If you believe a minor is using the Service, contact us immediately at {CONTACT_EMAIL}.
	</p>

	<h2>9. Your Rights</h2>
	<p>
		Depending on where you live (including California), you may have the right to know what personal
		information we hold about you, request a copy of it, request deletion, or correct inaccuracies.
		We don't sell personal information, so there's no “opt out of sale” action needed. To exercise
		any of these rights, email {CONTACT_EMAIL} from the address associated with your account so we can
		verify the request.
	</p>

	<h2>10. Cookies</h2>
	<p>
		We use only the cookies necessary to keep you signed in and to remember basic preferences (like
		browse filters). We don't use third-party advertising or analytics cookies.
	</p>

	<h2>11. International Use</h2>
	<p>
		The Service is operated in and intended for users in the United States, and your data is stored
		and processed there. If you access the Service from elsewhere, you do so at your own risk and
		consent to your data being transferred to and processed in the United States.
	</p>

	<h2>12. Changes to This Policy</h2>
	<p>
		We may update this Privacy Policy from time to time. Continued use of the Service after a change
		is posted means you accept the update. We'll update the effective date above whenever we do.
	</p>

	<h2>13. Contact</h2>
	<p>
		Questions or requests regarding this Privacy Policy? Reach us at <a
			href="mailto:{CONTACT_EMAIL}">{CONTACT_EMAIL}</a
		>.
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
