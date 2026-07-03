<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	let { data } = $props();

	const STEPS = 5;

	let step = $state(1);

	// Step 1 — Who you're looking for
	let lookingFor: Set<string> = $state(new Set());
	let ageMinNum = $state(18);
	let ageMaxNum = $state(50);
	let ageRangeEnabled = $state(false);

	// Step 2 — Vibe
	let nature: Set<string> = $state(new Set());
	let mood = $state('');

	// Step 3 — Write
	let subject = $state('');
	let body = $state('');
	let termDefinitions: Record<string, string> = $state({});

	// Step 4 — Requirements
	let trustTierMin = $state('new');
	let softRequirements = $state(['', '', '']);

	// Submit state
	let submitting = $state(false);
	let submitError = $state('');

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

	const trustOptions = [
		{ value: 'new', label: 'Anyone (new members welcome)' },
		{ value: 'established', label: 'Established members only' },
		{ value: 'trusted', label: 'Trusted members only' }
	];

	// Age slider
	const AGE_MIN = 18;
	const AGE_MAX = 75;

	function clampMin() {
		if (ageMinNum >= ageMaxNum) ageMinNum = ageMaxNum - 1;
	}
	function clampMax() {
		if (ageMaxNum <= ageMinNum) ageMaxNum = ageMinNum + 1;
	}

	const minPct = $derived(((ageMinNum - AGE_MIN) / (AGE_MAX - AGE_MIN)) * 100);
	const maxPct = $derived(((ageMaxNum - AGE_MIN) / (AGE_MAX - AGE_MIN)) * 100);

	// Relative terms vocabulary
	const RELATIVE_TERMS = [
		'cute', 'pretty', 'attractive', 'hot', 'fit', 'athletic', 'slim', 'thick',
		'large', 'small', 'tall', 'short', 'average',
		'nearby', 'close', 'local', 'far',
		'young', 'older', 'mature', 'younger',
		'serious', 'casual', 'laid back', 'intense', 'outgoing',
		'soon', 'later', 'regular', 'occasional', 'often'
	];

	function scanTerms(text: string): string[] {
		const found: string[] = [];
		for (const term of RELATIVE_TERMS) {
			const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const pattern = new RegExp(`\\b${escaped}\\b`, 'i');
			if (pattern.test(text)) found.push(term);
		}
		return found;
	}

	const foundTerms = $derived(scanTerms(body));

	$effect(() => {
		const current = new Set(foundTerms);
		for (const key of Object.keys(termDefinitions)) {
			if (!current.has(key)) {
				const next = { ...termDefinitions };
				delete next[key];
				termDefinitions = next;
			}
		}
	});

	function toggleSet(s: Set<string>, value: string): Set<string> {
		const next = new Set(s);
		if (next.has(value)) next.delete(value);
		else next.add(value);
		return next;
	}

	function toggleNature(value: string) {
		if (value === 'open') {
			nature = nature.has('open') ? new Set() : new Set(['open']);
		} else {
			const next = new Set(nature);
			next.delete('open');
			if (next.has(value)) next.delete(value);
			else next.add(value);
			nature = next;
		}
	}

	const step2Valid = $derived(nature.size > 0);

	const allTermsDefined = $derived(
		foundTerms.every((t) => (termDefinitions[t] ?? '').trim().length > 0)
	);
	const step3Valid = $derived(
		subject.trim().length >= 10 &&
		subject.trim().length <= 120 &&
		body.trim().length >= 50 &&
		allTermsDefined
	);

	const IDENTITY_LABELS: Record<string, string> = {
		man: 'Men', woman: 'Women', non_binary: 'Non-binary', transgender_man: 'Trans men',
		transgender_woman: 'Trans women', couple: 'Couples', other: 'Other'
	};
	const NATURE_LABELS: Record<string, string> = {
		dating: 'Dating', fwb: 'FWB', one_time: 'NSA', platonic: 'Platonic', open: 'Open'
	};
	const MOOD_LABELS: Record<string, string> = {
		coffee_first: 'Coffee first', dinner_date: 'Dinner date', netflix_chill: 'Netflix & chill',
		ready_now: 'Ready now', just_browsing: 'Just browsing'
	};
</script>

<div class="post-page">
	{#if data.hasActiveListing}
	<div class="blocked-notice">
		<p>You already have an active listing. Remove or let it expire before posting another.</p>
		<a href={resolve('/my-listings')}>Manage my listings →</a>
	</div>
	{:else}

	<div class="progress-bar">
		{#each Array(STEPS) as _, i}
			<div class="progress-step" class:done={i + 1 < step} class:active={i + 1 === step}></div>
		{/each}
	</div>

	<!-- Step 1: Who you're looking for -->
	{#if step === 1}
	<div class="step">
		<h2>Who can respond?</h2>
		<p class="step-hint">Who you'd like to hear from. Leave all unselected to allow anyone.</p>

		<div class="field">
			<span class="field-label">Identity</span>
			<div class="chip-group">
				{#each identityOptions as opt}
					<label class="chip {lookingFor.has(opt.value) ? 'selected' : ''}">
						<input id="looking-for-{opt.value}" type="checkbox" checked={lookingFor.has(opt.value)}
							onchange={() => (lookingFor = toggleSet(lookingFor, opt.value))} />
						{opt.label}
					</label>
				{/each}
			</div>
		</div>

		<div class="field">
			<div class="age-toggle-row">
				<span class="field-label">Age range</span>
				<label class="toggle-label">
					<input id="age-range-enabled" type="checkbox" bind:checked={ageRangeEnabled} />
					{ageRangeEnabled ? 'Enabled' : 'No preference'}
				</label>
			</div>

			<div class="age-display" class:muted={!ageRangeEnabled}>
				<span>{ageRangeEnabled ? ageMinNum : '—'}</span>
				<span class="age-sep">to</span>
				<span>{ageRangeEnabled ? (ageMaxNum >= AGE_MAX ? `${AGE_MAX}+` : ageMaxNum) : '—'}</span>
			</div>
			<div class="dual-range" class:disabled={!ageRangeEnabled}>
				<div class="range-track">
					<div class="range-fill" style="left: {minPct}%; right: {100 - maxPct}%"></div>
				</div>
				<input id="age-min-range" type="range" min={AGE_MIN} max={AGE_MAX} bind:value={ageMinNum}
					oninput={() => { ageRangeEnabled = true; clampMin(); }}
					class="range-input range-min" />
				<input id="age-max-range" type="range" min={AGE_MIN} max={AGE_MAX} bind:value={ageMaxNum}
					oninput={() => { ageRangeEnabled = true; clampMax(); }}
					class="range-input range-max" />
			</div>
		</div>

		<div class="step-nav">
			<span></span>
			<button onclick={() => (step = 2)}>Next →</button>
		</div>
	</div>

	<!-- Step 2: Nature + vibe -->
	{:else if step === 2}
	<div class="step">
		<h2>What are you looking for?</h2>

		<div class="field">
			<span class="field-label">Nature of connection <span class="required">*</span></span>
			<div class="chip-group">
				{#each natureOptions as opt}
					<label class="chip {nature.has(opt.value) ? 'selected' : ''}">
						<input id="nature-{opt.value}" type="checkbox" checked={nature.has(opt.value)}
							onchange={() => toggleNature(opt.value)} />
						{opt.label}
					</label>
				{/each}
			</div>
		</div>

		<div class="field">
			<span class="field-label">Vibe (optional)</span>
			<div class="chip-group">
				{#each moodOptions as opt}
					<label class="chip {mood === opt.value ? 'selected' : ''}">
						<input type="radio" name="mood" value={opt.value} checked={mood === opt.value}
							onchange={() => (mood = mood === opt.value ? '' : opt.value)} />
						{opt.label}
					</label>
				{/each}
			</div>
		</div>

		<div class="step-nav">
			<button class="secondary" onclick={() => (step = 1)}>← Back</button>
			<button onclick={() => (step = 3)} disabled={!step2Valid}>Next →</button>
		</div>
	</div>

	<!-- Step 3: Write -->
	{:else if step === 3}
	<div class="step">
		<h2>Write your listing</h2>

		<div class="field">
			<label for="subject">Subject line</label>
			<input
				id="subject"
				type="text"
				placeholder="Your hook — what makes someone want to read more"
				maxlength="120"
				bind:value={subject}
			/>
			<small>{subject.trim().length}/120 — minimum 10 characters</small>
		</div>

		<div class="field">
			<label for="body">Your listing</label>
			<textarea
				id="body"
				rows="8"
				placeholder="Tell people about yourself and what you're looking for. Be specific — vague listings get fewer responses."
				bind:value={body}
			></textarea>
			<small>{body.trim().length} characters — minimum 50</small>
		</div>

		{#if foundTerms.length > 0}
		<div class="terms-box">
			<p class="terms-heading">Define your terms</p>
			<p class="terms-desc">Help potential matches understand what you mean. All must be defined before continuing.</p>
			{#each foundTerms as term}
			<div class="term-row">
				<span class="term-chip">{term}</span>
				<input
					id="term-{term}"
					type="text"
					placeholder="What do you mean by this?"
					value={termDefinitions[term] ?? ''}
					oninput={(e) => {
						termDefinitions = { ...termDefinitions, [term]: (e.currentTarget as HTMLInputElement).value };
					}}
				/>
			</div>
			{/each}
		</div>
		{/if}

		<div class="step-nav">
			<button class="secondary" onclick={() => (step = 2)}>← Back</button>
			<button onclick={() => (step = 4)} disabled={!step3Valid}>Next →</button>
		</div>
	</div>

	<!-- Step 4: Requirements -->
	{:else if step === 4}
	<div class="step">
		<h2>Requirements</h2>
		<p class="step-hint">All optional. Hard requirements are checked before someone can message you.</p>

		<div class="field">
			<label for="trustTierMin">Minimum trust tier</label>
			<select id="trustTierMin" bind:value={trustTierMin}>
				{#each trustOptions as opt}
					<option value={opt.value}>{opt.label}</option>
				{/each}
			</select>
		</div>

		<div class="field">
			<span class="field-label">Soft requirements (optional)</span>
			<p class="field-hint">Responders must acknowledge these before messaging you.</p>
			{#each softRequirements as _, i}
			<input
				id="soft-req-{i}"
				type="text"
				placeholder="e.g. Must be okay with my schedule"
				bind:value={softRequirements[i]}
				style="margin-bottom: 0.5rem;"
			/>
			{/each}
		</div>

		<div class="step-nav">
			<button class="secondary" onclick={() => (step = 3)}>← Back</button>
			<button onclick={() => (step = 5)}>Review →</button>
		</div>
	</div>

	<!-- Step 5: Review and post -->
	{:else if step === 5}
	<div class="step">
		<h2>Review your listing</h2>

		<div class="review-card">
			<div class="review-section">
				<span class="review-label">Subject</span>
				<p class="review-subject">{subject}</p>
			</div>
			<div class="review-section">
				<span class="review-label">Body</span>
				<p class="review-body">{body}</p>
			</div>
			{#if foundTerms.length > 0}
			<div class="review-section">
				<span class="review-label">Term definitions</span>
				{#each foundTerms as term}
					<p class="review-term"><strong>{term}</strong> — {termDefinitions[term]}</p>
				{/each}
			</div>
			{/if}
			<div class="review-section review-meta">
				<div>
					<span class="review-label">Looking for</span>
					<p>{lookingFor.size === 0 ? 'Anyone' : [...lookingFor].map(v => IDENTITY_LABELS[v] ?? v).join(', ')}</p>
				</div>
				{#if ageRangeEnabled}
				<div>
					<span class="review-label">Age range</span>
					<p>{ageMinNum}–{ageMaxNum >= AGE_MAX ? `${AGE_MAX}+` : ageMaxNum}</p>
				</div>
				{/if}
				<div>
					<span class="review-label">Nature</span>
					<p>{[...nature].map(v => NATURE_LABELS[v] ?? v).join(', ')}</p>
				</div>
				{#if mood}
				<div>
					<span class="review-label">Vibe</span>
					<p>{MOOD_LABELS[mood] ?? mood}</p>
				</div>
				{/if}
				<div>
					<span class="review-label">Min trust tier</span>
					<p style="text-transform: capitalize">{trustTierMin}</p>
				</div>
				{#if softRequirements.some(s => s.trim())}
				<div>
					<span class="review-label">Soft requirements</span>
					{#each softRequirements.filter(s => s.trim()) as req}
						<p>· {req}</p>
					{/each}
				</div>
				{/if}
			</div>
		</div>

		{#if submitError}
			<p class="error">{submitError}</p>
		{/if}

		<form
			method="POST"
			action="?/post"
			use:enhance={() => {
				submitting = true;
				submitError = '';
				return async ({ result }) => {
					submitting = false;
					if (result.type === 'redirect') {
						goto(result.location);
					} else if (result.type === 'failure') {
						submitError = (result.data?.error as string) ?? 'Something went wrong';
					}
				};
			}}
		>
			{#each [...lookingFor] as id}
				<input type="hidden" name="lookingFor" value={id} />
			{/each}
			<input type="hidden" name="ageMin" value={ageRangeEnabled ? ageMinNum : ''} />
			<input type="hidden" name="ageMax" value={ageRangeEnabled ? ageMaxNum : ''} />
			{#each [...nature] as n}
				<input type="hidden" name="nature" value={n} />
			{/each}
			<input type="hidden" name="mood" value={mood} />
			<input type="hidden" name="subject" value={subject} />
			<input type="hidden" name="body" value={body} />
			{#each foundTerms as term}
				<input type="hidden" name="termKey" value={term} />
				<input type="hidden" name="termValue" value={termDefinitions[term] ?? ''} />
			{/each}
			<input type="hidden" name="trustTierMin" value={trustTierMin} />
			{#each softRequirements.filter(s => s.trim()) as req}
				<input type="hidden" name="softReq" value={req} />
			{/each}

			<div class="step-nav">
				<button type="button" class="secondary" onclick={() => (step = 4)}>← Back</button>
				<button type="submit" aria-busy={submitting} disabled={submitting}>
					{submitting ? '' : 'Post listing'}
				</button>
			</div>
		</form>
	</div>
	{/if}
	{/if}
</div>

<style>
	.blocked-notice {
		padding: 1.25rem 1.5rem;
		background: color-mix(in srgb, var(--pico-primary) 8%, transparent);
		border: 1px solid color-mix(in srgb, var(--pico-primary) 25%, transparent);
		border-radius: 10px;
		font-size: 0.9rem;
	}

	.blocked-notice p {
		margin-bottom: 0.5rem;
	}

	.blocked-notice a {
		font-weight: 600;
		color: var(--pico-primary);
	}

	.post-page {
		max-width: 600px;
		margin-inline: auto;
	}

	.progress-bar {
		display: flex;
		gap: 0.35rem;
		margin-bottom: 2rem;
	}

	.progress-step {
		flex: 1;
		height: 4px;
		border-radius: 2px;
		background: var(--pico-muted-border-color);
		transition: background 0.2s;
	}

	.progress-step.done {
		background: color-mix(in srgb, var(--pico-primary) 50%, transparent);
	}

	.progress-step.active {
		background: var(--pico-primary);
	}

	.step h2 {
		font-size: 1.25rem;
		font-weight: 700;
		margin-bottom: 0.35rem;
	}

	.step-hint, .field-hint {
		font-size: 0.875rem;
		color: var(--pico-muted-color);
		margin-bottom: 1.25rem;
	}

	.field-hint {
		margin-top: -0.5rem;
		margin-bottom: 0.5rem;
	}

	.field {
		margin-bottom: 1.25rem;
	}

	.field label, .field-label {
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
	}

	.required {
		color: var(--pico-del-color);
	}

	/* Age range toggle */
	.age-toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}

	.age-toggle-row .field-label {
		margin-bottom: 0;
	}

	.toggle-label {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.8rem;
		color: var(--pico-muted-color);
		cursor: pointer;
	}

	.toggle-label input {
		width: auto;
		margin: 0;
	}

	/* Dual range slider */
	.age-display {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1rem;
		font-weight: 600;
		margin-bottom: 0.75rem;
		color: var(--pico-primary);
	}

	.age-sep {
		font-size: 0.875rem;
		font-weight: 400;
		color: var(--pico-muted-color);
	}

	.dual-range {
		position: relative;
		height: 2rem;
		margin: 0 0.5rem;
	}

	.range-track {
		position: absolute;
		top: 50%;
		left: 0;
		right: 0;
		height: 4px;
		transform: translateY(-50%);
		background: var(--pico-muted-border-color);
		border-radius: 2px;
		z-index: 0;
		pointer-events: none;
	}

	.range-fill {
		position: absolute;
		top: 0;
		height: 100%;
		background: var(--pico-primary);
		border-radius: 2px;
	}

	.range-input {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		width: 100%;
		margin: 0;
		padding: 0;
		height: 4px;
		background: transparent;
		appearance: none;
		pointer-events: none;
	}

	.range-input::-webkit-slider-thumb {
		appearance: none;
		pointer-events: all;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--pico-primary);
		border: 2px solid var(--pico-background-color);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
		cursor: pointer;
	}

	.range-input::-moz-range-thumb {
		pointer-events: all;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--pico-primary);
		border: 2px solid var(--pico-background-color);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
		cursor: pointer;
	}

	.range-input::-webkit-slider-runnable-track {
		background: transparent;
	}

	.range-input::-moz-range-track {
		background: transparent;
	}

	.range-input::-moz-range-progress {
		background: transparent;
	}

	.age-display.muted {
		color: var(--pico-muted-color);
		opacity: 0.5;
	}

	.dual-range.disabled {
		opacity: 0.4;
	}

	/* Chips */
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

	.chip input { display: none; }

	.chip.selected {
		background: color-mix(in srgb, var(--pico-primary) 12%, transparent);
		border-color: var(--pico-primary);
		color: var(--pico-primary);
		font-weight: 500;
	}

	/* Relative terms */
	.terms-box {
		background: color-mix(in srgb, var(--pico-primary) 6%, transparent);
		border: 1px solid color-mix(in srgb, var(--pico-primary) 20%, transparent);
		border-radius: 8px;
		padding: 1rem 1.25rem;
		margin-bottom: 1.25rem;
	}

	.terms-heading {
		font-size: 0.875rem;
		font-weight: 600;
		margin-bottom: 0.2rem;
	}

	.terms-desc {
		font-size: 0.8rem;
		color: var(--pico-muted-color);
		margin-bottom: 1rem;
	}

	.term-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.6rem;
	}

	.term-chip {
		flex-shrink: 0;
		font-size: 0.8rem;
		font-weight: 500;
		padding: 0.2rem 0.6rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--pico-primary) 15%, transparent);
		color: var(--pico-primary);
		min-width: 5rem;
		text-align: center;
	}

	.term-row input {
		flex: 1;
		margin-bottom: 0;
		font-size: 0.875rem;
	}

	/* Review */
	.review-card {
		background: var(--pico-card-background-color);
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 10px;
		padding: 1.25rem;
		margin-bottom: 1.25rem;
	}

	.review-section {
		margin-bottom: 1rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--pico-muted-border-color);
	}

	.review-section:last-child {
		margin-bottom: 0;
		padding-bottom: 0;
		border-bottom: none;
	}

	.review-label {
		display: block;
		font-size: 0.72rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--pico-muted-color);
		margin-bottom: 0.3rem;
	}

	.review-subject {
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
	}

	.review-body {
		font-size: 0.875rem;
		color: var(--pico-muted-color);
		margin: 0;
		white-space: pre-wrap;
		line-height: 1.55;
	}

	.review-term {
		font-size: 0.875rem;
		margin-bottom: 0.2rem;
		color: var(--pico-muted-color);
	}

	.review-meta {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem;
	}

	.review-meta p {
		font-size: 0.875rem;
		margin: 0;
	}

	/* Nav */
	.step-nav {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		margin-top: 1.5rem;
	}

	button.secondary {
		background: transparent;
		border: 1px solid var(--pico-muted-border-color);
		color: var(--pico-muted-color);
	}

	.error {
		color: var(--pico-del-color);
		font-size: 0.875rem;
		margin-bottom: 0.75rem;
	}
</style>
