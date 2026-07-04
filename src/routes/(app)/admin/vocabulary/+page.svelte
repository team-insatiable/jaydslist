<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form } = $props();

	let submitting = $state<string | null>(null);
	let newTerm = $state('');
	let newCategory = $state('physical');

	const CATEGORY_LABELS: Record<string, string> = {
		physical: 'Physical',
		distance: 'Distance',
		age: 'Age',
		personality: 'Personality',
		timing: 'Timing',
		other: 'Other'
	};

	const grouped = $derived.by(() => {
		const groups: Record<string, typeof data.terms> = {};
		for (const t of data.terms) {
			(groups[t.category] ??= []).push(t);
		}
		return groups;
	});
</script>

<div>
	<h1>Relative Terms Vocabulary</h1>
	<p class="hint">
		Words flagged as vague/relative in listing bodies, requiring the poster to define them.
		Deactivating a term stops new flagging without affecting already-published listings.
	</p>

	{#if form?.error}
		<p class="form-error">{form.error}</p>
	{/if}

	<form
		method="POST"
		action="?/create"
		class="add-form"
		use:enhance={() => {
			submitting = 'create';
			return async ({ result, update }) => {
				submitting = null;
				if (result.type === 'success') newTerm = '';
				await update();
				await invalidateAll();
			};
		}}
	>
		<input
			type="text"
			name="term"
			bind:value={newTerm}
			placeholder="New term"
			required
			maxlength="40"
		/>
		<select name="category" bind:value={newCategory}>
			{#each Object.entries(CATEGORY_LABELS) as [value, label] (value)}
				<option {value}>{label}</option>
			{/each}
		</select>
		<button type="submit" disabled={submitting === 'create'} aria-busy={submitting === 'create'}>
			Add term
		</button>
	</form>

	{#each Object.entries(CATEGORY_LABELS) as [category, label] (category)}
		{#if grouped[category]?.length}
			<section class="category-group">
				<h2>{label}</h2>
				<ul class="term-list">
					{#each grouped[category] as term (term.id)}
						<li class="term-row" class:inactive={!term.active}>
							<span class="term-name">{term.term}</span>
							<div class="term-actions">
								<form
									method="POST"
									action="?/toggle"
									use:enhance={() => {
										submitting = term.id + '_toggle';
										return async ({ update }) => {
											submitting = null;
											await update();
											await invalidateAll();
										};
									}}
								>
									<input type="hidden" name="id" value={term.id} />
									<button
										type="submit"
										class="toggle-btn"
										disabled={submitting === term.id + '_toggle'}
									>
										{term.active ? 'Deactivate' : 'Activate'}
									</button>
								</form>
								<form
									method="POST"
									action="?/delete"
									use:enhance={() => {
										submitting = term.id + '_delete';
										return async ({ update }) => {
											submitting = null;
											await update();
											await invalidateAll();
										};
									}}
								>
									<input type="hidden" name="id" value={term.id} />
									<button
										type="submit"
										class="delete-btn"
										disabled={submitting === term.id + '_delete'}
									>
										Delete
									</button>
								</form>
							</div>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	{/each}
</div>

<style>
	.hint {
		color: var(--pico-muted-color);
		font-size: 0.875rem;
		margin-bottom: 1.5rem;
	}

	.form-error {
		color: var(--pico-del-color);
		font-size: 0.875rem;
	}

	.add-form {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 2rem;
	}

	.add-form input[type='text'] {
		flex: 1;
	}

	.category-group {
		margin-bottom: 1.5rem;
	}

	.category-group h2 {
		font-size: 0.95rem;
		font-weight: 700;
		margin-bottom: 0.5rem;
	}

	.term-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.term-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 6px;
		margin-bottom: 0.4rem;
	}

	.term-row.inactive {
		opacity: 0.5;
	}

	.term-name {
		font-weight: 600;
	}

	.term-actions {
		display: flex;
		gap: 0.5rem;
	}

	.term-actions form {
		margin: 0;
	}

	.toggle-btn,
	.delete-btn {
		font-size: 0.8rem;
		padding: 0.3rem 0.6rem;
	}

	.delete-btn {
		background: var(--pico-del-color);
		border-color: var(--pico-del-color);
	}
</style>
