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

	let identity = $state(data.profile?.identity ?? '');
	let physicalType = $state(data.profile?.physicalType ?? '');
	let age = $state(data.profile?.age?.toString() ?? '');
	let profileSaving = $state(false);
	let profileSaved = $state(false);
	let profileError = $state('');

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
					if (result.type === 'success') {
						profileSaved = true;
					} else if (result.type === 'failure') {
						profileError = (result.data?.error as string) ?? 'Something went wrong';
					}
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
				<input
					id="age"
					name="age"
					type="number"
					min="18"
					max="99"
					placeholder="Your age"
					bind:value={age}
					required
				/>
			</div>

			<button type="submit" aria-busy={profileSaving} disabled={profileSaving || !identity || !physicalType || !age}>
				{profileSaving ? '' : 'Save'}
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
					if (result.type === 'failure') {
						contactError = (result.data?.error as string) ?? 'Something went wrong';
					} else {
						newContactValue = '';
					}
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
				<input
					name="value"
					type="text"
					placeholder="Handle, number, or address"
					bind:value={newContactValue}
				/>
				<button type="submit" aria-busy={contactSaving} disabled={contactSaving || !newContactValue.trim()}>
					Add
				</button>
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
			<dd>{data.profile?.responseRate != null ? Math.round((data.profile.responseRate) * 100) + '%' : '—'}</dd>
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
		margin-top: 0.3rem;
	}

	.field select,
	.field input {
		margin-bottom: 0;
	}

	button[type='submit'] {
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
