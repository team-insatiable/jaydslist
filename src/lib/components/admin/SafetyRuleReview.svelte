<script lang="ts">
	import type { SafetyPolicy } from '$lib/content-safety/rules';
	let { policy }: { policy: SafetyPolicy } = $props();
	const queueLabels = {
		urgent: 'Urgent safety',
		solicitation: 'Solicitation',
		general: 'General safety'
	};
</script>

<div class="rule-review">
	<p class="review-count">
		{policy.sections.length}
		{policy.sections.length === 1 ? 'section' : 'sections'} · {policy.sections.reduce(
			(total, section) => total + section.rules.length,
			0
		)} rules
	</p>
	{#if policy.sections.length === 0 || policy.sections.every((section) => section.rules.length === 0)}
		<p class="empty-warning">
			This file contains no checks. If activated, it will not flag any matches.
		</p>
	{/if}
	{#each policy.sections as section (section.id)}
		<section class="rule-section">
			<div class="section-heading">
				<h3>{section.label}</h3>
				<span class="queue">{queueLabels[section.queue]} queue</span>
			</div>
			{#if section.rules.length === 0}<p>No rules in this section.</p>{/if}
			{#each section.rules as rule (rule.id)}
				<article class="rule-card">
					<h4>{rule.label}</h4>
					<p class="intent">{rule.intent}</p>
					<dl>
						<div>
							<dt>Checks</dt>
							<dd>
								{rule.scope === 'both'
									? 'Listings and messages'
									: rule.scope === 'listing'
										? 'Listings'
										: 'Messages'}
							</dd>
						</div>
						<div>
							<dt>All of</dt>
							<dd>{rule.all.join(' + ')}</dd>
						</div>
						{#if rule.any?.length}<div>
								<dt>Plus any of</dt>
								<dd>{rule.any.join(' / ')}</dd>
							</div>{/if}
						{#if rule.none?.length}<div>
								<dt>Exclude if present</dt>
								<dd>{rule.none.join(' / ')}</dd>
							</div>{/if}
						{#if rule.withinWords}<div>
								<dt>Distance</dt>
								<dd>Within {rule.withinWords} words</dd>
							</div>{/if}
					</dl>
					<p class="risk"><strong>Review carefully:</strong> {rule.falsePositiveRisk}</p>
				</article>
			{/each}
		</section>
	{/each}
</div>

<style>
	.review-count {
		font-weight: 700;
		margin-bottom: 1rem;
	}

	.empty-warning {
		padding: 0.75rem 1rem;
		border: 1px solid var(--pico-del-color);
		border-radius: 0.5rem;
	}

	.rule-section {
		margin: 1.25rem 0;
		padding: 1rem;
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 0.75rem;
	}

	.section-heading {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.section-heading h3,
	.rule-card h4 {
		margin: 0;
	}

	.queue {
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--pico-primary);
	}

	.rule-card {
		padding: 1rem 0;
		border-top: 1px solid var(--pico-muted-border-color);
	}

	.rule-card h4 {
		font-size: 1rem;
	}

	.intent {
		margin: 0.4rem 0 0.75rem;
	}

	dl {
		display: grid;
		gap: 0.4rem;
		margin: 0;
	}

	dl div {
		display: grid;
		grid-template-columns: minmax(6rem, 8rem) minmax(0, 1fr);
		gap: 0.5rem;
	}

	dt {
		color: var(--pico-muted-color);
	}

	dd {
		margin: 0;
		font-weight: 600;
		overflow-wrap: anywhere;
	}

	.risk {
		margin: 0.9rem 0 0;
		padding: 0.75rem;
		border-radius: 0.5rem;
		background: var(--pico-card-background-color);
		font-size: 0.9rem;
	}

	@media (max-width: 600px) {
		dl div {
			grid-template-columns: 1fr;
			gap: 0.1rem;
		}
	}
</style>
