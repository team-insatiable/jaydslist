<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { scanTerms } from '$lib/relative-terms';
	import { SvelteSet } from 'svelte/reactivity';

	let { data, form } = $props();

	const { listing, requirements, termDefinitions } = data;

	// Looking for
	let lookingFor: Set<string> = $state(new Set(listing.lookingForIdentity));

	// Nature
	let nature: Set<string> = $state(new Set(listing.natureOfConnection));

	// Vibe
	let mood = $state(listing.mood ?? '');
	let availability = $state(listing.availability ?? '');

	// Content
	let subject = $state(listing.subject);
	let body = $state(listing.body);

	// Age range
	let ageRangeEnabled = $state(requirements.ageMin !== null || requirements.ageMax !== null);
	let ageMinNum = $state(requirements.ageMin ? parseInt(requirements.ageMin) : 18);
	let ageMaxNum = $state(requirements.ageMax ? parseInt(requirements.ageMax) : 50);

	// Requirements
	let trustTierMin = $state(requirements.trustTierMin ?? 'new');
	let softRequirements = $state(
		requirements.softPrompts.length > 0
			? [...requirements.softPrompts, '', ''].slice(0, 3)
			: ['', '', '']
	);

	// Term definitions
	let termDefs: Record<string, string> = $state(
		Object.fromEntries(termDefinitions.map((t) => [t.term, t.definition]))
	);

	let submitting = $state(false);

	const identityOptions = [
		{ value: 'man', label: 'Man' },
		{ value: 'woman', label: 'Woman' },
		{ value: 'non_binary', label: 'Non-binary' },
		{ value: 'transgender_man', label: 'Transgender man' },
		{ value: 'transgender_woman', label: 'Transgender woman' },
		{ value: 'couple', label: 'Couple' },
		{ value: 'other', label: 'Other' }
	];

	const natureOptions = [
		{ value: 'open', label: 'Open to anything' },
		{ value: 'dating', label: 'Dating' },
		{ value: 'fwb', label: 'Friends with Benefits' },
		{ value: 'one_time', label: 'One time / NSA' },
		{ value: 'platonic', label: 'Strictly Platonic' }
	];

	const moodOptions = [
		{ value: 'coffee_first', label: 'Coffee first' },
		{ value: 'dinner_date', label: 'Dinner date' },
		{ value: 'netflix_chill', label: 'Netflix & chill' },
		{ value: 'ready_now', label: 'Ready now' },
		{ value: 'just_browsing', label: 'Just browsing' }
	];

	const availabilityOptions = [
		{ value: 'available_now', label: 'Available now' },
		{ value: 'available_today', label: 'Available today' },
		{ value: 'available_weekend', label: 'This weekend' },
		{ value: 'flexible', label: 'Flexible' }
	];

	const trustOptions = [
		{ value: 'new', label: 'Anyone (new members welcome)' },
		{ value: 'established', label: 'Established members only' },
		{ value: 'trusted', label: 'Trusted members only' }
	];

	const AGE_MIN = 18;
	const AGE_MAX = 75;

	const minPct = $derived(((ageMinNum - AGE_MIN) / (AGE_MAX - AGE_MIN)) * 100);
	const maxPct = $derived(((ageMaxNum - AGE_MIN) / (AGE_MAX - AGE_MIN)) * 100);

	function clampMin() {
		if (ageMinNum >= ageMaxNum) ageMinNum = ageMaxNum - 1;
	}
	function clampMax() {
		if (ageMaxNum <= ageMinNum) ageMaxNum = ageMinNum + 1;
	}

	function toggleSet(s: Set<string>, value: string): Set<string> {
		const next = new SvelteSet(s);
		if (next.has(value)) next.delete(value);
		else next.add(value);
		return next;
	}

	function toggleNature(value: string) {
		if (value === 'open') {
			nature = nature.has('open') ? new Set() : new Set(['open']);
		} else {
			const next = new SvelteSet(nature);
			next.delete('open');
			if (next.has(value)) next.delete(value);
			else next.add(value);
			nature = next;
		}
	}

	const foundTerms = $derived(scanTerms(body));

	$effect(() => {
		const current = new Set(foundTerms);
		for (const key of Object.keys(termDefs)) {
			if (!current.has(key)) {
				const next = { ...termDefs };
				delete next[key];
				termDefs = next;
			}
		}
	});

	const allTermsDefined = $derived(foundTerms.every((t) => (termDefs[t] ?? '').trim().length > 0));

	const canSave = $derived(
		nature.size > 0 &&
			subject.trim().length >= 10 &&
			subject.trim().length <= 120 &&
			body.trim().length >= 50 &&
			allTermsDefined
	);
</script>

<div class="edit-page">
	<header class="edit-header">
		<a href={resolve(`/listings/${listing.id}`)} class="back-link">
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"><polyline points="15 18 9 12 15 6" /></svg
			>
			Back to listing
		</a>
		<h1>Edit listing</h1>
	</header>

	{#if listing.status === 'flagged'}
		<div class="flagged-notice">
			<strong>Your listing has been suspended by a moderator.</strong>
			{#if data.suspensionReason}
				<br />Reason: {data.suspensionReason}
			{/if}
			<br />Edit it to address the issue, then save to reactivate it.
		</div>
	{/if}

	{#if form?.error}
		<p class="form-error">{form.error}</p>
	{/if}

	<form
		method="POST"
		action="?/save"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				submitting = false;
				await update();
			};
		}}
	>
		<!-- Hidden inputs for sets -->
		{#each [...lookingFor] as val (val)}<input type="hidden" name="lookingFor" value={val} />{/each}
		{#each [...nature] as val (val)}<input type="hidden" name="nature" value={val} />{/each}
		{#each foundTerms as term (term)}
			<input type="hidden" name="termKey" value={term} />
			<input type="hidden" name="termValue" value={termDefs[term] ?? ''} />
		{/each}

		<!-- Section: Who can respond -->
		<section class="card">
			<h2>Who can respond?</h2>
			<p class="hint">Leave all unselected to allow anyone.</p>
			<div class="chip-group">
				{#each identityOptions as opt (opt.value)}
					<button
						type="button"
						class="chip {lookingFor.has(opt.value) ? 'selected' : ''}"
						onclick={() => (lookingFor = toggleSet(lookingFor, opt.value))}
					>
						{opt.label}
					</button>
				{/each}
			</div>
		</section>

		<!-- Section: Nature of connection -->
		<section class="card">
			<h2>Nature of connection <span class="required">*</span></h2>
			<div class="chip-group">
				{#each natureOptions as opt (opt.value)}
					<button
						type="button"
						class="chip {nature.has(opt.value) ? 'selected' : ''}"
						onclick={() => toggleNature(opt.value)}
					>
						{opt.label}
					</button>
				{/each}
			</div>
		</section>

		<!-- Section: Vibe -->
		<section class="card">
			<h2>Vibe</h2>
			<div class="two-col">
				<div class="field">
					<label class="field-label" for="mood">Mood</label>
					<select id="mood" name="mood" bind:value={mood}>
						<option value="">Not specified</option>
						{#each moodOptions as opt (opt.value)}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>
				</div>
				<div class="field">
					<label class="field-label" for="availability">Availability</label>
					<select id="availability" name="availability" bind:value={availability}>
						<option value="">Not specified</option>
						{#each availabilityOptions as opt (opt.value)}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>
				</div>
			</div>
		</section>

		<!-- Section: Content -->
		<section class="card">
			<h2>Your listing</h2>
			<div class="field">
				<label class="field-label" for="subject">Subject line <span class="required">*</span></label
				>
				<input
					id="subject"
					name="subject"
					type="text"
					bind:value={subject}
					placeholder="Your hook — what makes you stand out?"
					maxlength="120"
				/>
				<span class="char-hint {subject.trim().length > 120 ? 'over' : ''}"
					>{subject.trim().length}/120</span
				>
			</div>
			<div class="field">
				<label class="field-label" for="body">Body <span class="required">*</span></label>
				<textarea
					id="body"
					name="body"
					bind:value={body}
					rows="10"
					placeholder="Tell them about yourself and what you're looking for…"
				></textarea>
				<span class="char-hint"
					>{body.trim().length} chars {body.trim().length < 50
						? `(${50 - body.trim().length} more needed)`
						: ''}</span
				>
			</div>

			{#if foundTerms.length > 0}
				<div class="terms-section">
					<p class="terms-heading">Define your relative terms</p>
					<p class="hint">
						These words mean different things to different people. Help responders understand what
						you mean.
					</p>
					{#each foundTerms as term (term)}
						<div class="term-row">
							<span class="term-badge">{term}</span>
							<input
								id="term-{term}"
								type="text"
								placeholder="What do you mean by this?"
								bind:value={termDefs[term]}
								oninput={(e) => {
									termDefs = { ...termDefs, [term]: (e.target as HTMLInputElement).value };
								}}
							/>
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<!-- Section: Requirements -->
		<section class="card">
			<h2>Requirements</h2>

			<div class="field">
				<label class="field-label">Minimum trust tier</label>
				<select name="trustTierMin" bind:value={trustTierMin}>
					{#each trustOptions as opt (opt.value)}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</select>
			</div>

			<div class="field">
				<label class="field-label" for="age-range-toggle">
					<input id="age-range-toggle" type="checkbox" bind:checked={ageRangeEnabled} />
					Age range requirement
				</label>
				{#if ageRangeEnabled}
					<input type="hidden" name="ageMin" value={ageMinNum} />
					<input type="hidden" name="ageMax" value={ageMaxNum} />
					<div class="age-range">
						<div class="age-track">
							<div class="age-fill" style="left:{minPct}%; right:{100 - maxPct}%"></div>
							<div class="age-thumb" style="left:{minPct}%"></div>
							<div class="age-thumb" style="left:{maxPct}%"></div>
							<input
								id="age-min-range"
								type="range"
								min={AGE_MIN}
								max={AGE_MAX}
								bind:value={ageMinNum}
								oninput={clampMin}
								class="range-input range-min"
							/>
							<input
								id="age-max-range"
								type="range"
								min={AGE_MIN}
								max={AGE_MAX}
								bind:value={ageMaxNum}
								oninput={clampMax}
								class="range-input range-max"
							/>
						</div>
						<div class="age-labels"><span>{ageMinNum}</span><span>{ageMaxNum}</span></div>
					</div>
				{/if}
			</div>

			<div class="field">
				<label class="field-label">Soft requirements</label>
				<p class="hint">Responders must acknowledge these before messaging.</p>
				{#each softRequirements as _, i (i)}
					<input
						type="text"
						name="softReq"
						bind:value={softRequirements[i]}
						placeholder="e.g. Please read the full listing before responding"
						class="soft-req-input"
					/>
				{/each}
			</div>
		</section>

		<div class="save-bar">
			<a href={resolve(`/listings/${listing.id}`)} class="cancel-btn">Cancel</a>
			<button type="submit" disabled={!canSave || submitting} aria-busy={submitting}>
				{submitting ? '' : 'Save changes'}
			</button>
		</div>
	</form>
</div>

<style>
	.edit-page {
		max-width: 640px;
		margin-inline: auto;
	}

	.edit-header {
		margin-bottom: 1.5rem;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.875rem;
		color: var(--pico-muted-color);
		text-decoration: none;
		margin-bottom: 0.75rem;
	}

	.back-link:hover {
		color: var(--pico-color);
	}

	h1 {
		font-size: 1.4rem;
		font-weight: 700;
		margin: 0;
	}

	.card {
		background: var(--pico-card-background-color);
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 10px;
		padding: 1.25rem;
		margin-bottom: 1rem;
	}

	.card h2 {
		font-size: 0.95rem;
		font-weight: 600;
		margin: 0 0 0.75rem;
	}

	.hint {
		font-size: 0.8rem;
		color: var(--pico-muted-color);
		margin: -0.25rem 0 0.75rem;
	}

	.required {
		color: var(--pico-del-color);
	}

	.chip-group {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.chip {
		padding: 0.35rem 0.85rem;
		border-radius: 999px;
		border: 1px solid var(--pico-muted-border-color);
		background: transparent !important;
		box-shadow: none !important;
		font-size: 0.85rem;
		cursor: pointer;
		color: inherit !important;
		transition: all 0.15s;
	}

	.chip.selected {
		background: var(--pico-primary);
		border-color: var(--pico-primary);
		color: white;
	}

	.two-col {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.field {
		margin-bottom: 1rem;
	}
	.field:last-child {
		margin-bottom: 0;
	}

	.field-label {
		display: block;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--pico-muted-color);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin-bottom: 0.4rem;
	}

	.char-hint {
		font-size: 0.75rem;
		color: var(--pico-muted-color);
		display: block;
		text-align: right;
		margin-top: 0.25rem;
	}
	.char-hint.over {
		color: var(--pico-del-color);
	}

	.terms-section {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--pico-muted-border-color);
	}

	.terms-heading {
		font-size: 0.875rem;
		font-weight: 600;
		margin-bottom: 0.25rem;
	}

	.term-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.term-badge {
		background: color-mix(in srgb, var(--pico-primary) 12%, transparent);
		color: var(--pico-primary);
		border-radius: 4px;
		padding: 0.2rem 0.5rem;
		font-size: 0.8rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.term-row input {
		margin: 0;
		flex: 1;
	}

	/* Age range slider */
	.age-range {
		margin-top: 0.75rem;
	}

	.age-track {
		position: relative;
		height: 4px;
		background: var(--pico-muted-border-color);
		border-radius: 2px;
		margin: 1.5rem 0 0.5rem;
	}

	.age-fill {
		position: absolute;
		height: 100%;
		background: var(--pico-primary);
		border-radius: 2px;
	}

	.age-thumb {
		position: absolute;
		width: 18px;
		height: 18px;
		background: var(--pico-primary);
		border: 2px solid var(--pico-background-color);
		border-radius: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		pointer-events: none;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
	}

	.range-input {
		position: absolute;
		width: 100%;
		top: -8px;
		height: 20px;
		opacity: 0;
		cursor: pointer;
		margin: 0;
		padding: 0;
		pointer-events: none;
	}

	.range-input::-webkit-slider-thumb {
		pointer-events: all;
	}
	.range-input::-moz-range-thumb {
		pointer-events: all;
	}

	.age-labels {
		display: flex;
		justify-content: space-between;
		font-size: 0.85rem;
		font-weight: 600;
	}

	.soft-req-input {
		margin-bottom: 0.5rem;
	}
	.soft-req-input:last-child {
		margin-bottom: 0;
	}

	.flagged-notice {
		background: color-mix(in srgb, #d97706 10%, transparent);
		border: 1px solid color-mix(in srgb, #d97706 30%, transparent);
		color: #d97706;
		border-radius: 8px;
		padding: 0.75rem 1rem;
		font-size: 0.875rem;
		margin-bottom: 1rem;
		line-height: 1.5;
	}

	.save-bar {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 1rem;
		padding: 1rem 0 2rem;
	}

	.save-bar button {
		width: auto;
		margin: 0;
	}

	.cancel-btn {
		font-size: 0.9rem;
		color: var(--pico-muted-color);
		text-decoration: none;
	}

	.cancel-btn:hover {
		color: var(--pico-color);
	}

	.form-error {
		background: color-mix(in srgb, var(--pico-del-color) 10%, transparent);
		border: 1px solid color-mix(in srgb, var(--pico-del-color) 30%, transparent);
		color: var(--pico-del-color);
		border-radius: 8px;
		padding: 0.75rem 1rem;
		font-size: 0.875rem;
		margin-bottom: 1rem;
	}
</style>
