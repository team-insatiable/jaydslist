<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();

	const identityOptions = [
		{ value: 'man', label: 'Man' },
		{ value: 'woman', label: 'Woman' },
		{ value: 'non_binary', label: 'Non-binary' },
		{ value: 'transgender_man', label: 'Transgender man' },
		{ value: 'transgender_woman', label: 'Transgender woman' },
		{ value: 'other', label: 'Other' }
	];

	const physicalOptions = [
		{ value: 'male', label: 'Male' },
		{ value: 'female', label: 'Female' },
		{ value: 'other', label: 'Other' }
	];

	const natureOptions = [
		{ value: 'dating', label: 'Dating / Getting to know someone' },
		{ value: 'fwb', label: 'Friends with Benefits' },
		{ value: 'one_time', label: 'One time / No strings attached' },
		{ value: 'platonic', label: 'Strictly Platonic' },
		{ value: 'open', label: 'Open to anything' }
	];

	const radiusOptions = [5, 10, 25, 50, 100];

	const contactTypeOptions = [
		{ value: 'phone', label: 'Phone' },
		{ value: 'email', label: 'Email' },
		{ value: 'signal', label: 'Signal' },
		{ value: 'telegram', label: 'Telegram' },
		{ value: 'whatsapp', label: 'WhatsApp' },
		{ value: 'snapchat', label: 'Snapchat' },
		{ value: 'instagram', label: 'Instagram' },
		{ value: 'discord', label: 'Discord' },
		{ value: 'other', label: 'Other' }
	];

	// About you
	let identity = $state(data.profile?.identity ?? '');
	let physicalType = $state(data.profile?.physicalType ?? '');
	let age = $state(data.profile?.age?.toString() ?? '');
	let profileSaving = $state(false);
	let profileSaved = $state(false);
	let profileError = $state('');

	// Location
	let locationSet = $state(data.profile?.locationSet ?? false);
	let browseRadius = $state(data.profile?.browseRadius ?? 25);
	let locationSaving = $state(false);
	let locationError = $state('');
	let locationStatus = $state('');

	async function setLocation() {
		locationError = '';
		locationStatus = 'Getting your location…';
		locationSaving = true;

		let coords: GeolocationCoordinates;
		try {
			const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
				navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
			);
			coords = pos.coords;
		} catch {
			locationError = 'Unable to get your location. Please allow location access and try again.';
			locationStatus = '';
			locationSaving = false;
			return;
		}

		const form = new FormData();
		form.set('lat', coords.latitude.toString());
		form.set('lng', coords.longitude.toString());
		form.set('radius', browseRadius.toString());

		const res = await fetch('?/saveLocation', { method: 'POST', body: form });
		const result = await res.json();

		locationSaving = false;

		if (result.type === 'success') {
			locationSet = true;
			locationStatus = 'Location saved.';
		} else {
			locationError = result.data?.error ?? 'Failed to save location';
			locationStatus = '';
		}
	}

	// Seeking preferences
	let seekingIdentity = $state(new Set(data.profile?.seekingIdentity ?? []));
	let seekingPhysicalType = $state(data.profile?.seekingPhysicalType ?? '');
	let seekingNature = $state(new Set(data.profile?.seekingNatureOfConnection ?? []));
	let prefSaving = $state(false);
	let prefSaved = $state(false);
	let prefError = $state('');

	function toggleSet(s: Set<string>, value: string): Set<string> {
		const next = new Set(s);
		if (next.has(value)) next.delete(value);
		else next.add(value);
		return next;
	}

	// Contact methods
	let newContactType = $state('signal');
	let newContactValue = $state('');
	let contactSaving = $state(false);
	let contactError = $state('');
</script>

<div class="profile-page">
	<h1>Your Profile</h1>

	{#if !data.isComplete}
		<div class="notice">
			<strong>Complete your profile</strong> to post listings and reply to others. Identity, physical type, and age are required.
		</div>
	{/if}

	<!-- About You -->
	<section class="card">
		<h2>About you</h2>

		{#if profileError}
			<p class="error">{profileError}</p>
		{/if}
		{#if profileSaved}
			<p class="success">Profile saved.</p>
		{/if}

		<form
			method="POST"
			action="?/saveProfile"
			use:enhance={() => {
				profileSaving = true;
				profileSaved = false;
				profileError = '';
				return async ({ result, update }) => {
					profileSaving = false;
					if (result.type === 'success') profileSaved = true;
					else if (result.type === 'failure') profileError = (result.data?.error as string) ?? 'Something went wrong';
					await update();
				};
			}}
		>
			<div class="field">
				<label for="identity">I identify as</label>
				<select id="identity" name="identity" bind:value={identity} required>
					<option value="" disabled>Select…</option>
					{#each identityOptions as opt}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</select>
			</div>

			<div class="field">
				<label for="physicalType">Physical type</label>
				<select id="physicalType" name="physicalType" bind:value={physicalType} required>
					<option value="" disabled>Select…</option>
					{#each physicalOptions as opt}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</select>
				<small>Used when posters filter by physical type. Kept separate from identity by design.</small>
			</div>

			<div class="field">
				<label for="age">Age</label>
				<input id="age" name="age" type="number" min="18" max="99" placeholder="Your age" bind:value={age} required />
			</div>

			<button type="submit" aria-busy={profileSaving} disabled={profileSaving || !identity || !physicalType || !age}>
				{profileSaving ? '' : 'Save'}
			</button>
		</form>
	</section>

	<!-- Location -->
	<section class="card">
		<h2>Your location</h2>
		<p class="muted">Coordinates are stored privately and never shared. Only your general area is shown publicly.</p>

		<div class="location-status">
			{#if locationSet}
				<span class="location-set">Location set</span>
			{:else}
				<span class="location-unset">Not set — required to browse by distance</span>
			{/if}
		</div>

		<div class="field">
			<label for="browseRadius">Browse radius</label>
			<select id="browseRadius" bind:value={browseRadius}>
				{#each radiusOptions as r}
					<option value={r}>{r} miles</option>
				{/each}
			</select>
		</div>

		{#if locationError}
			<p class="error">{locationError}</p>
		{/if}
		{#if locationStatus}
			<p class="success">{locationStatus}</p>
		{/if}

		<button onclick={setLocation} aria-busy={locationSaving} disabled={locationSaving}>
			{locationSaving ? '' : locationSet ? 'Update location' : 'Set my location'}
		</button>
	</section>

	<!-- Looking For -->
	<section class="card">
		<h2>Looking for</h2>
		<p class="muted">Your preferences for browsing. You can still view any listing, but these help filter your feed.</p>

		{#if prefError}
			<p class="error">{prefError}</p>
		{/if}
		{#if prefSaved}
			<p class="success">Preferences saved.</p>
		{/if}

		<form
			method="POST"
			action="?/savePreferences"
			use:enhance={() => {
				prefSaving = true;
				prefSaved = false;
				prefError = '';
				return async ({ result, update }) => {
					prefSaving = false;
					if (result.type === 'success') prefSaved = true;
					else if (result.type === 'failure') prefError = (result.data?.error as string) ?? 'Something went wrong';
					await update();
				};
			}}
		>
			<div class="field">
				<label>Identity</label>
				<small>Select all that apply, or none for no preference</small>
				<div class="chip-group">
					{#each identityOptions as opt}
						<label class="chip {seekingIdentity.has(opt.value) ? 'selected' : ''}">
							<input
								type="checkbox"
								name="seekingIdentity"
								value={opt.value}
								checked={seekingIdentity.has(opt.value)}
								onchange={() => (seekingIdentity = toggleSet(seekingIdentity, opt.value))}
							/>
							{opt.label}
						</label>
					{/each}
				</div>
			</div>

			<div class="field">
				<label for="seekingPhysicalType">Physical type preference</label>
				<select id="seekingPhysicalType" name="seekingPhysicalType" bind:value={seekingPhysicalType}>
					<option value="">No preference</option>
					{#each physicalOptions as opt}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</select>
			</div>

			<div class="field">
				<label>Nature of connection</label>
				<small>Select all that interest you</small>
				<div class="chip-group">
					{#each natureOptions as opt}
						<label class="chip {seekingNature.has(opt.value) ? 'selected' : ''}">
							<input
								type="checkbox"
								name="seekingNatureOfConnection"
								value={opt.value}
								checked={seekingNature.has(opt.value)}
								onchange={() => (seekingNature = toggleSet(seekingNature, opt.value))}
							/>
							{opt.label}
						</label>
					{/each}
				</div>
			</div>

			<button type="submit" aria-busy={prefSaving} disabled={prefSaving}>
				{prefSaving ? '' : 'Save preferences'}
			</button>
		</form>
	</section>

	<!-- Contact Methods -->
	<section class="card">
		<h2>Contact methods</h2>
		<p class="muted">Stored encrypted. Only shared when you offer your key during a conversation.</p>

		{#if data.contacts.length > 0}
			<ul class="contact-list">
				{#each data.contacts as contact}
					<li class="contact-item">
						<div class="contact-info">
							<span class="contact-type">{contact.type}</span>
							<span class="contact-value">{contact.value}</span>
							{#if contact.isDefault}
								<span class="default-badge">Default</span>
							{/if}
						</div>
						<div class="contact-actions">
							{#if !contact.isDefault}
								<form method="POST" action="?/setDefault" use:enhance>
									<input type="hidden" name="id" value={contact.id} />
									<button type="submit" class="link-btn">Set default</button>
								</form>
							{/if}
							<form method="POST" action="?/removeContact" use:enhance>
								<input type="hidden" name="id" value={contact.id} />
								<button type="submit" class="link-btn danger">Remove</button>
							</form>
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="muted empty">No contact methods added yet.</p>
		{/if}

		{#if contactError}
			<p class="error">{contactError}</p>
		{/if}

		<form
			method="POST"
			action="?/addContact"
			class="add-contact-form"
			use:enhance={() => {
				contactSaving = true;
				contactError = '';
				return async ({ result, update }) => {
					contactSaving = false;
					if (result.type === 'failure') contactError = (result.data?.error as string) ?? 'Something went wrong';
					else newContactValue = '';
					await update();
				};
			}}
		>
			<div class="contact-row">
				<select name="type" bind:value={newContactType}>
					{#each contactTypeOptions as opt}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</select>
				<input name="value" type="text" placeholder="Handle, number, or address" bind:value={newContactValue} />
				<button type="submit" aria-busy={contactSaving} disabled={contactSaving || !newContactValue.trim()}>Add</button>
			</div>
		</form>
	</section>

	<!-- Account Info -->
	<section class="card account-info">
		<h2>Account</h2>
		<dl>
			<dt>Trust tier</dt>
			<dd class="tier tier-{data.profile?.trustTier ?? 'new'}">{data.profile?.trustTier ?? 'new'}</dd>
			<dt>Response rate</dt>
			<dd>{data.profile?.responseRate != null ? Math.round(data.profile.responseRate * 100) + '%' : '—'}</dd>
		</dl>
	</section>
</div>

<style>
	.profile-page {
		max-width: 560px;
		margin-inline: auto;
	}

	h1 {
		font-size: 1.5rem;
		font-weight: 700;
		margin-bottom: 1.25rem;
	}

	.notice {
		background: color-mix(in srgb, var(--pico-primary) 8%, transparent);
		border: 1px solid color-mix(in srgb, var(--pico-primary) 25%, transparent);
		border-radius: 8px;
		padding: 0.875rem 1rem;
		font-size: 0.875rem;
		margin-bottom: 1.5rem;
		color: var(--pico-color);
	}

	.card {
		background: var(--pico-card-background-color);
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 10px;
		padding: 1.5rem;
		margin-bottom: 1.25rem;
	}

	h2 {
		font-size: 1rem;
		font-weight: 600;
		margin-bottom: 1rem;
	}

	.field {
		margin-bottom: 1rem;
	}

	.field label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		margin-bottom: 0.35rem;
	}

	.field small {
		display: block;
		font-size: 0.775rem;
		color: var(--pico-muted-color);
		margin-top: 0.2rem;
		margin-bottom: 0.5rem;
	}

	.field select,
	.field input {
		margin-bottom: 0;
	}

	button[type='submit'],
	button:not([type]) {
		margin-top: 0.5rem;
	}

	.error {
		color: var(--pico-del-color);
		font-size: 0.875rem;
		margin-bottom: 0.75rem;
	}

	.success {
		color: var(--pico-ins-color);
		font-size: 0.875rem;
		margin-bottom: 0.75rem;
	}

	.muted {
		font-size: 0.875rem;
		color: var(--pico-muted-color);
		margin-bottom: 1rem;
	}

	.empty {
		margin-bottom: 1rem;
	}

	/* Location */
	.location-status {
		margin-bottom: 1rem;
		font-size: 0.875rem;
	}

	.location-set {
		color: var(--pico-ins-color);
		font-weight: 500;
	}

	.location-unset {
		color: var(--pico-muted-color);
	}

	/* Chip group for multiselect */
	.chip-group {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 0.25rem;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.35rem 0.75rem;
		border-radius: 999px;
		border: 1px solid var(--pico-muted-border-color);
		font-size: 0.8rem;
		cursor: pointer;
		background: transparent;
		color: var(--pico-color);
		transition: background 0.1s, border-color 0.1s;
		margin: 0;
		font-weight: normal;
	}

	.chip input {
		display: none;
	}

	.chip.selected {
		background: color-mix(in srgb, var(--pico-primary) 12%, transparent);
		border-color: var(--pico-primary);
		color: var(--pico-primary);
		font-weight: 500;
	}

	/* Contact list */
	.contact-list {
		list-style: none;
		padding: 0;
		margin: 0 0 1rem;
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 8px;
		overflow: hidden;
	}

	.contact-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--pico-muted-border-color);
		gap: 0.75rem;
	}

	.contact-item:last-child {
		border-bottom: none;
	}

	.contact-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
	}

	.contact-type {
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: capitalize;
		color: var(--pico-muted-color);
		flex-shrink: 0;
	}

	.contact-value {
		font-size: 0.875rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.default-badge {
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--pico-primary);
		background: color-mix(in srgb, var(--pico-primary) 10%, transparent);
		border-radius: 4px;
		padding: 0.1rem 0.4rem;
		flex-shrink: 0;
	}

	.contact-actions {
		display: flex;
		gap: 0.75rem;
		flex-shrink: 0;
	}

	.link-btn {
		background: none;
		border: none;
		padding: 0;
		font-size: 0.8rem;
		color: var(--pico-primary);
		cursor: pointer;
		width: auto;
		margin: 0;
	}

	.link-btn.danger {
		color: var(--pico-del-color);
	}

	/* Add contact form */
	.add-contact-form {
		margin-top: 0.5rem;
	}

	.contact-row {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: 0.5rem;
		align-items: start;
	}

	.contact-row select,
	.contact-row input {
		margin-bottom: 0;
	}

	.contact-row button {
		margin: 0;
		white-space: nowrap;
	}

	/* Account info */
	.account-info dl {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem 1rem;
		margin: 0;
	}

	.account-info dt {
		font-size: 0.8rem;
		color: var(--pico-muted-color);
		font-weight: 500;
	}

	.account-info dd {
		font-size: 0.875rem;
		font-weight: 600;
		margin: 0;
		text-transform: capitalize;
	}

	.tier-new { color: var(--pico-muted-color); }
	.tier-established { color: var(--pico-primary); }
	.tier-trusted { color: var(--pico-ins-color); }
</style>
